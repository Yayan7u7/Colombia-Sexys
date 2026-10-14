import { ConflictException } from '@nestjs/common';
import { ExtensionsService } from './extensions.service';
import { Prorrogas } from './entities/extension.entity';
import { Empleadas } from '../employees/entities/employee.entity';

describe('ExtensionsService', () => {
  function armar({
    serviceExtensions = 0,
    weeklyExtensions = 0,
    weekStart = '2026-10-12',
  } = {}) {
    const serviceRecord: any = {
      id: 'service-1',
      estado: 'en_curso',
      empleadaId: 'employee-1',
      prorrogasUsadas: serviceExtensions,
    };
    const employeeRecord: any = {
      id: 'employee-1',
      prorrogasEsperaSemanaInicio: weekStart,
      prorrogasEsperaUsadas: weeklyExtensions,
    };
    const manager = {
      findOne: jest
        .fn()
        .mockImplementation((entity: unknown) =>
          entity === Empleadas
            ? Promise.resolve(employeeRecord)
            : Promise.resolve(serviceRecord),
        ),
      save: jest
        .fn()
        .mockImplementation((_entity: any, value?: any) =>
          Promise.resolve(value || _entity),
        ),
    };
    const dataSource = {
      transaction: (callback: any) => callback(manager),
    } as any;
    return {
      serviceRecord,
      employeeRecord,
      manager,
      service: new ExtensionsService(dataSource),
    };
  }

  it('concede 10 minutos en el primer uso semanal', async () => {
    const { service, serviceRecord, employeeRecord, manager } = armar();

    const result = await service.requestServiceExtension(
      'service-1',
      undefined,
      new Date('2026-10-14T15:00:00.000Z'),
    );

    expect(result).toMatchObject({
      extensionNumber: 1,
      weeklyNumber: 1,
      weeklyRemaining: 1,
      minutes: 10,
    });
    expect(serviceRecord.prorrogasUsadas).toBe(1);
    expect(employeeRecord.prorrogasEsperaUsadas).toBe(1);
    expect(manager.save).toHaveBeenCalledWith(
      Prorrogas,
      expect.objectContaining({ numeroProrroga: 1, minutosSolicitados: 10 }),
    );
  });

  it('concede 5 minutos en el segundo uso semanal', async () => {
    const { service, employeeRecord } = armar({ weeklyExtensions: 1 });

    const result = await service.requestServiceExtension(
      'service-1',
      undefined,
      new Date('2026-10-14T15:00:00.000Z'),
    );

    expect(result).toMatchObject({
      weeklyNumber: 2,
      weeklyRemaining: 0,
      minutes: 5,
    });
    expect(employeeRecord.prorrogasEsperaUsadas).toBe(2);
  });

  it('rechaza el tercer uso semanal', async () => {
    const { service } = armar({ weeklyExtensions: 2 });

    await expect(
      service.requestServiceExtension(
        'service-1',
        undefined,
        new Date('2026-10-14T15:00:00.000Z'),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('reinicia el cupo cuando cambia la semana operativa', async () => {
    const { service, employeeRecord } = armar({ weeklyExtensions: 2 });

    const result = await service.requestServiceExtension(
      'service-1',
      undefined,
      new Date('2026-10-19T15:00:00.000Z'),
    );

    expect(result.minutes).toBe(10);
    expect(result.weeklyNumber).toBe(1);
    expect(employeeRecord.prorrogasEsperaUsadas).toBe(1);
    expect(employeeRecord.prorrogasEsperaSemanaInicio).toBe('2026-10-19');
  });
});
