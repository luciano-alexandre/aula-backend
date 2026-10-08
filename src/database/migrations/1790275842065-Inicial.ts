import { MigrationInterface, QueryRunner } from "typeorm";

export class Inicial1790275842065 implements MigrationInterface {
    name = 'Inicial1790275842065'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "solicitacoes" ("id" SERIAL NOT NULL, "titulo" character varying(150) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pendente', "valor_estimado_centavos" integer NOT NULL, "centro_custo" character varying(30) NOT NULL, "versao" integer NOT NULL, "criada_em" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "atualizada_em" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_solicitacoes_status" CHECK (status IN ('pendente', 'aprovada', 'rejeitada')), CONSTRAINT "PK_795aaa33114295368cac771de45" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "auditorias" ("id" SERIAL NOT NULL, "ator_id" integer NOT NULL, "acao" character varying(50) NOT NULL, "recurso_tipo" character varying(50) NOT NULL, "recurso_id" integer NOT NULL, "detalhes" jsonb, "criada_em" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b84b3505f313ab1a44e7b684ee2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "centros_custo" ("codigo" character varying(30) NOT NULL, "nome" character varying(100) NOT NULL, "saldo_disponivel_centavos" integer NOT NULL, "versao" integer NOT NULL, CONSTRAINT "PK_2cf4cc82a75a27a96b77a7f4939" PRIMARY KEY ("codigo"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "centros_custo"`);
        await queryRunner.query(`DROP TABLE "auditorias"`);
        await queryRunner.query(`DROP TABLE "solicitacoes"`);
    }

}
