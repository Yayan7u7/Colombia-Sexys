import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La espera del chofer se concede por empleada y por semana operativa, no por
 * servicio. Se conservan las prórrogas históricas en `prorrogas`; estas dos
 * columnas solo representan el cupo vigente de la semana actual.
 */
export class AddWeeklyWaitExtensions1810001100000 implements MigrationInterface {
  name = 'AddWeeklyWaitExtensions1810001100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "empleadas"
        ADD COLUMN IF NOT EXISTS "prorrogas_espera_semana_inicio" date,
        ADD COLUMN IF NOT EXISTS "prorrogas_espera_usadas" smallint NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      UPDATE "empleadas" AS e
         SET "prorrogas_espera_semana_inicio" =
               date_trunc('week', timezone('America/Mexico_City', now()))::date,
             "prorrogas_espera_usadas" = LEAST(2, COALESCE(hist.usadas, 0))
        FROM (
          SELECT s."empleada_id" AS empleada_id,
                 COUNT(*)::int AS usadas
            FROM "prorrogas" p
            JOIN "servicios" s ON s."id" = p."servicio_id"
           WHERE p."solicitada_at" >= date_trunc(
                   'week', timezone('America/Mexico_City', now())
                 ) AT TIME ZONE 'America/Mexico_City'
           GROUP BY s."empleada_id"
        ) AS hist
       WHERE e."id" = hist.empleada_id;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
            FROM pg_constraint
           WHERE conname = 'chk_empleadas_prorrogas_espera_usadas'
             AND conrelid = 'empleadas'::regclass
        ) THEN
          ALTER TABLE "empleadas"
            ADD CONSTRAINT "chk_empleadas_prorrogas_espera_usadas"
            CHECK ("prorrogas_espera_usadas" BETWEEN 0 AND 2);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "empleadas"
        DROP CONSTRAINT IF EXISTS "chk_empleadas_prorrogas_espera_usadas",
        DROP COLUMN IF EXISTS "prorrogas_espera_usadas",
        DROP COLUMN IF EXISTS "prorrogas_espera_semana_inicio";
    `);
  }
}
