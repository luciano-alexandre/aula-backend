import { MigrationInterface, QueryRunner } from 'typeorm';

// A migration inicial atual já cria centros e valor estimado.
// Esta evolução preserva esses dados e acrescenta as garantias do encontro 13.
export class GarantirIntegridadeOrcamento1790630000000 implements MigrationInterface {
  name = 'GarantirIntegridadeOrcamento1790630000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "solicitacoes"
      ADD "prioridade" varchar(20) NOT NULL DEFAULT 'normal',
      ALTER COLUMN "valor_estimado_centavos" SET DEFAULT 0,
      ALTER COLUMN "versao" SET DEFAULT 1,
      ADD CONSTRAINT "CHK_solicitacoes_valor_estimado" CHECK ("valor_estimado_centavos" >= 0)`);
    await queryRunner.query(`ALTER TABLE "centros_custo"
      ALTER COLUMN "versao" SET DEFAULT 1,
      ADD CONSTRAINT "CHK_centros_custo_saldo" CHECK ("saldo_disponivel_centavos" >= 0)`);
    await queryRunner.query(`INSERT INTO "centros_custo"
      ("codigo", "nome", "saldo_disponivel_centavos", "versao")
      SELECT DISTINCT "centro_custo", "centro_custo", 0, 1 FROM "solicitacoes"
      WHERE "centro_custo" IS NOT NULL
      ON CONFLICT ("codigo") DO NOTHING`);
    await queryRunner.query(`ALTER TABLE "solicitacoes"
      ADD CONSTRAINT "FK_solicitacoes_centro_custo" FOREIGN KEY ("centro_custo")
      REFERENCES "centros_custo"("codigo") ON UPDATE CASCADE ON DELETE RESTRICT`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "solicitacoes"
      DROP CONSTRAINT "FK_solicitacoes_centro_custo",
      DROP CONSTRAINT "CHK_solicitacoes_valor_estimado",
      ALTER COLUMN "valor_estimado_centavos" DROP DEFAULT,
      ALTER COLUMN "versao" DROP DEFAULT,
      DROP COLUMN "prioridade"`);
    await queryRunner.query(`ALTER TABLE "centros_custo"
      DROP CONSTRAINT "CHK_centros_custo_saldo",
      ALTER COLUMN "versao" DROP DEFAULT`);
  }
}
