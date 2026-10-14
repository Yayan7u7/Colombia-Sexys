import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Servicios } from '../services/entities/service.entity';
import { Empleadas } from '../employees/entities/employee.entity';
import { Prorrogas } from './entities/extension.entity';
import { lunesDeLaSemana } from '../common/locale';
import {
  WEEKLY_WAIT_EXTENSION_LIMIT,
  waitExtensionMinutesForUse,
} from './wait-extension-policy';

@Injectable()
export class ExtensionsService {
  constructor(private readonly dataSource: DataSource) {}

  async requestServiceExtension(
    serviceId: string,
    requestedEmployeeId?: string,
    now = new Date(),
  ) {
    return this.dataSource.transaction(async (manager) => {
      const service = await manager.findOne(Servicios, {
        where: { id: serviceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!service) throw new NotFoundException('Servicio no encontrado');
      if (!['pendiente', 'agendado', 'en_curso'].includes(service.estado)) {
        throw new ConflictException('El servicio ya no está activo');
      }

      const employeeId =
        requestedEmployeeId ?? service.empleadaId ?? service.empleada?.id;
      if (!employeeId) {
        throw new ConflictException(
          'No se pudo identificar a la empleada del servicio',
        );
      }

      // La fila de la empleada serializa dos solicitudes simultáneas, incluso
      // si vienen de servicios distintos, para no gastar dos veces el mismo
      // cupo semanal.
      const employee = await manager.findOne(Empleadas, {
        where: { id: employeeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!employee) throw new NotFoundException('Empleada no encontrada');

      const weekStart = lunesDeLaSemana(now);
      if (employee.prorrogasEsperaSemanaInicio !== weekStart) {
        employee.prorrogasEsperaSemanaInicio = weekStart;
        employee.prorrogasEsperaUsadas = 0;
      }

      const weeklyNumber = (employee.prorrogasEsperaUsadas ?? 0) + 1;
      const minutes = waitExtensionMinutesForUse(weeklyNumber);
      if (!minutes || weeklyNumber > WEEKLY_WAIT_EXTENSION_LIMIT) {
        throw new ConflictException(
          'Ya usaste las 2 prórrogas de espera de esta semana. No hay más tiempo adicional.',
        );
      }

      const nextNumber = (service.prorrogasUsadas ?? 0) + 1;
      await manager.save(Prorrogas, {
        servicioId: service.id,
        numeroProrroga: nextNumber,
        minutosSolicitados: minutes,
        aprobada: true,
      });
      employee.prorrogasEsperaUsadas = weeklyNumber;
      await manager.save(employee);
      service.prorrogasUsadas = nextNumber;
      await manager.save(service);

      return {
        service,
        extensionNumber: nextNumber,
        weeklyNumber,
        weeklyRemaining: WEEKLY_WAIT_EXTENSION_LIMIT - weeklyNumber,
        minutes,
      };
    });
  }
}
