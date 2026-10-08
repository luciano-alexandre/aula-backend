import 'dotenv/config';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { execFileSync } from 'node:child_process';
import request from 'supertest';
import { Server } from 'node:http';
import { AppModule } from '../src/app.module';
import { Solicitacao } from '../src/solicitacoes/solicitacao.entity';
import { Auditoria } from '../src/auditoria/auditoria.entity';
import { CentroCusto } from '../src/centros-custo/centro-custo.entity';
import { Inicial1790275842065 } from '../src/database/migrations/1790275842065-Inicial';
import { GarantirIntegridadeOrcamento1790630000000 } from '../src/database/migrations/1790630000000-GarantirIntegridadeOrcamento';

describe('Aprovação com orçamento e rejeição (PostgreSQL temporário)', () => {
  let app: INestApplication;
  let admin: DataSource;
  let db: DataSource;
  let gestor: string;
  let nomeBanco: string;
  const bancoOriginal = process.env.DB_NAME;
  const justificativa = 'Informações insuficientes para a compra';

  beforeAll(async () => {
    admin = await new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: bancoOriginal,
    }).initialize();
    nomeBanco = `atividade11_test_${Date.now()}_${process.pid}`;
    await admin.query(`CREATE DATABASE "${nomeBanco}"`);
    process.env.DB_NAME = nomeBanco;
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('TypeOrmModuleOptions')
      .useValue({
        ...admin.options,
        database: nomeBanco,
        entities: [Solicitacao, Auditoria, CentroCusto],
        migrations: [
          Inicial1790275842065,
          GarantirIntegridadeOrcamento1790630000000,
        ],
        synchronize: false,
        migrationsRun: true,
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    db = app.get(DataSource);
    gestor = app.get(JwtService).sign({ sub: 1, papel: 'gestor' });
  }, 60000);

  afterAll(async () => {
    await app?.close();
    process.env.DB_NAME = bancoOriginal;
    if (admin?.isInitialized) {
      if (nomeBanco)
        await admin.query(
          `DROP DATABASE IF EXISTS "${nomeBanco}" WITH (FORCE)`,
        );
      await admin.destroy();
    }
  });

  let sequencia = 0;
  const criar = async (valorEstimadoCentavos = 120000, codigo?: string) => {
    const centroCusto = codigo ?? `CC-TESTE-${++sequencia}`;
    if (!codigo)
      await db.getRepository(CentroCusto).save({
        codigo: centroCusto,
        nome: 'Centro de teste',
        saldoDisponivelCentavos: 500000,
      });
    const result = await request(app.getHttpServer() as Server)
      .post('/solicitacoes')
      .auth(gestor, { type: 'bearer' })
      .send({
        titulo: 'Compra para teste de rejeição',
        centroCusto,
        valorEstimadoCentavos,
        prioridade: 'normal',
      })
      .expect(201);
    return result.body as Solicitacao;
  };
  const decidir = (
    id: number,
    body: object,
    token = gestor,
    acao = 'rejeitar',
  ) =>
    request(app.getHttpServer() as Server)
      .patch(`/solicitacoes/${id}/${acao}`)
      .auth(token, { type: 'bearer' })
      .send(body);

  it('aplica migrations em banco vazio, reverte e reaplica a restrição', async () => {
    expect(await db.showMigrations()).toBe(false);
    const item = await criar();
    await expect(
      db.query('UPDATE solicitacoes SET status = $1 WHERE id = $2', [
        'invalido',
        item.id,
      ]),
    ).rejects.toThrow();
    await db.undoLastMigration();
    await db.runMigrations();
    await expect(
      db.query('UPDATE solicitacoes SET status = $1 WHERE id = $2', [
        'invalido',
        item.id,
      ]),
    ).rejects.toThrow();
  });

  it('repete o seed sem duplicar ou redefinir decisões', async () => {
    const seed = () =>
      execFileSync(
        process.execPath,
        ['-r', 'ts-node/register', 'src/database/seeds/solicitacoes.seed.ts'],
        { env: process.env, stdio: 'pipe' },
      );
    seed();
    const repo = db.getRepository(Solicitacao);
    const titulo = 'Aquisição de monitor - prática 2';
    const item = await repo.findOneByOrFail({ titulo });
    await decidir(item.id, {
      versaoCentroCusto: 1,
      versaoSolicitacao: item.versao,
      justificativa,
    }).expect(200);
    const total = await repo.count();
    seed();
    expect(await repo.count()).toBe(total);
    expect(await repo.countBy({ titulo })).toBe(1);
    expect((await repo.findOneByOrFail({ titulo })).status).toBe('rejeitada');
  }, 30000);

  it('exige JWT e papel gestor', async () => {
    const item = await criar();
    const body = {
      versaoCentroCusto: 1,
      versaoSolicitacao: item.versao,
      justificativa,
    };
    await request(app.getHttpServer() as Server)
      .patch(`/solicitacoes/${item.id}/rejeitar`)
      .send(body)
      .expect(401);
    await decidir(item.id, body, 'invalido').expect(401);
    for (const papel of ['solicitante', 'auditor']) {
      const token = app.get(JwtService).sign({ sub: 2, papel });
      await decidir(item.id, body, token).expect(403);
    }
    expect(
      (await db.getRepository(Solicitacao).findOneByOrFail({ id: item.id }))
        .status,
    ).toBe('pendente');
  });

  it('recusa entradas inválidas sem alterar o banco', async () => {
    const item = await criar();
    const bodies = [
      {
        versaoCentroCusto: 1,
        versaoSolicitacao: item.versao,
        justificativa: 'curta',
      },
      {
        versaoCentroCusto: 1,
        versaoSolicitacao: item.versao,
        justificativa: 'x'.repeat(201),
      },
      {
        versaoCentroCusto: 1,
        versaoSolicitacao: item.versao,
        justificativa: ' '.repeat(20),
      },
      { versaoCentroCusto: 1, versaoSolicitacao: item.versao },
      { justificativa },
      { versaoCentroCusto: 1, versaoSolicitacao: 0, justificativa },
      { versaoCentroCusto: 1, versaoSolicitacao: 1.5, justificativa },
      {
        versaoCentroCusto: 1,
        versaoSolicitacao: item.versao,
        justificativa,
        atorId: 999,
      },
    ];
    for (const body of bodies) await decidir(item.id, body).expect(400);
    expect(
      await db.getRepository(Solicitacao).findOneByOrFail({ id: item.id }),
    ).toMatchObject({ status: 'pendente', versao: item.versao });
    expect(
      await db.getRepository(Auditoria).countBy({ recursoId: item.id }),
    ).toBe(0);
    await decidir(2147483647, {
      versaoCentroCusto: 1,
      versaoSolicitacao: 1,
      justificativa,
    }).expect(404);
    await decidir(item.id, {
      versaoCentroCusto: 1,
      versaoSolicitacao: item.versao + 1,
      justificativa,
    }).expect(409);
  });

  it.each([10, 200])(
    'aceita justificativa com %i caracteres e registra auditoria',
    async (tamanho) => {
      const item = await criar();
      const motivo = 'x'.repeat(tamanho);
      const result = await decidir(item.id, {
        versaoCentroCusto: 1,
        versaoSolicitacao: item.versao,
        justificativa: motivo,
      }).expect(200);
      expect(result.body).toMatchObject({
        status: 'rejeitada',
        versao: item.versao + 1,
      });
      const audit = await db
        .getRepository(Auditoria)
        .findOneByOrFail({ recursoId: item.id });
      expect(audit).toMatchObject({
        atorId: 1,
        acao: 'SOLICITACAO_REJEITADA',
        recursoTipo: 'solicitacao',
        detalhes: {
          justificativa: motivo,
          statusAnterior: 'pendente',
          statusAtual: 'rejeitada',
          versaoAnterior: item.versao,
          versaoAtual: item.versao + 1,
        },
      });
      expect(audit.criadaEm).toBeInstanceOf(Date);
      expect(Object.keys(audit.detalhes!).sort()).toEqual(
        [
          'justificativa',
          'statusAnterior',
          'statusAtual',
          'versaoAnterior',
          'versaoAtual',
        ].sort(),
      );
      for (const acao of ['aprovar', 'rejeitar']) {
        await decidir(
          item.id,
          {
            versaoCentroCusto: 1,
            versaoSolicitacao: item.versao,
            ...(acao === 'rejeitar' ? { justificativa } : {}),
          },
          gestor,
          acao,
        ).expect(409);
      }
    },
  );

  it('preserva consulta e aprovação, impedindo rejeitar uma aprovada', async () => {
    const item = await criar();
    await request(app.getHttpServer() as Server)
      .get('/solicitacoes')
      .auth(gestor, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer() as Server)
      .get(`/solicitacoes/${item.id}`)
      .auth(gestor, { type: 'bearer' })
      .expect(200);
    await decidir(
      item.id,
      { versaoCentroCusto: 1, versaoSolicitacao: item.versao },
      gestor,
      'aprovar',
    ).expect(200);
    await decidir(item.id, {
      versaoCentroCusto: 1,
      versaoSolicitacao: item.versao + 1,
      justificativa,
    }).expect(409);
  });

  it('permite apenas uma decisão concorrente com a mesma versão', async () => {
    const item = await criar();
    const results = await Promise.all([
      decidir(item.id, {
        versaoCentroCusto: 1,
        versaoSolicitacao: item.versao,
        justificativa,
      }),
      decidir(
        item.id,
        { versaoCentroCusto: 1, versaoSolicitacao: item.versao },
        gestor,
        'aprovar',
      ),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(
      (await db.getRepository(Solicitacao).findOneByOrFail({ id: item.id }))
        .versao,
    ).toBe(item.versao + 1);
    expect(
      await db.getRepository(Auditoria).countBy({ recursoId: item.id }),
    ).toBe(1);
  });

  it('desfaz a atualização se a inserção da auditoria falhar', async () => {
    const item = await criar();
    await db.query(
      `ALTER TABLE auditorias ADD CONSTRAINT falha_auditoria_teste CHECK (recurso_id <> ${item.id})`,
    );
    try {
      app.useLogger(false);
      await decidir(item.id, {
        versaoCentroCusto: 1,
        versaoSolicitacao: item.versao,
        justificativa,
      }).expect(500);
      expect(
        await db.getRepository(Solicitacao).findOneByOrFail({ id: item.id }),
      ).toMatchObject({ status: 'pendente', versao: item.versao });
      expect(
        await db.getRepository(Auditoria).countBy({ recursoId: item.id }),
      ).toBe(0);
    } finally {
      await db.query(
        'ALTER TABLE auditorias DROP CONSTRAINT falha_auditoria_teste',
      );
    }
  });
  const aprovar = (item: Solicitacao, versaoCentroCusto = 1) =>
    decidir(
      item.id,
      { versaoSolicitacao: item.versao, versaoCentroCusto },
      gestor,
      'aprovar',
    );

  const estado = async (item: Solicitacao) => ({
    solicitacao: await db
      .getRepository(Solicitacao)
      .findOneByOrFail({ id: item.id }),
    centro: await db
      .getRepository(CentroCusto)
      .findOneByOrFail({ codigo: item.centroCusto }),
    auditorias: await db
      .getRepository(Auditoria)
      .findBy({ recursoId: item.id }),
  });

  it('consulta saldo e versão apenas com JWT e retorna 404 para centro ausente', async () => {
    const item = await criar();
    await request(app.getHttpServer() as Server)
      .get(`/centros-custo/${item.centroCusto}`)
      .expect(401);
    const resposta = await request(app.getHttpServer() as Server)
      .get(`/centros-custo/${item.centroCusto}`)
      .auth(gestor, { type: 'bearer' })
      .expect(200);
    expect(resposta.body).toMatchObject({
      codigo: item.centroCusto,
      saldoDisponivelCentavos: 500000,
      versao: 1,
    });
    await request(app.getHttpServer() as Server)
      .get('/centros-custo/ausente')
      .auth(gestor, { type: 'bearer' })
      .expect(404);
  });

  it('reserva 120000 centavos e audita ator, saldos e versões na mesma transação', async () => {
    const item = await criar();
    await aprovar(item).expect(200);
    const atual = await estado(item);
    expect(atual.solicitacao).toMatchObject({
      status: 'aprovada',
      versao: 2,
      prioridade: 'normal',
    });
    expect(atual.centro).toMatchObject({
      saldoDisponivelCentavos: 380000,
      versao: 2,
    });
    expect(atual.auditorias).toHaveLength(1);
    expect(atual.auditorias[0]).toMatchObject({
      atorId: 1,
      acao: 'SOLICITACAO_APROVADA_COM_RESERVA',
      recursoTipo: 'solicitacao',
      recursoId: item.id,
      detalhes: {
        centroCusto: item.centroCusto,
        valorReservadoCentavos: 120000,
        saldoAnteriorCentavos: 500000,
        saldoResultanteCentavos: 380000,
        versaoSolicitacaoUtilizada: 1,
        versaoCentroCustoUtilizada: 1,
      },
    });
    await aprovar(item).expect(409);
    expect(await estado(item)).toEqual(atual);
  });

  it('recusa saldo insuficiente e versões antigas sem efeitos persistidos', async () => {
    const caro = await criar(600000);
    const anterior = await estado(caro);
    await aprovar(caro).expect(409);
    expect(await estado(caro)).toEqual(anterior);
    const item = await criar();
    const antes = await estado(item);
    await aprovar(item, 2).expect(409);
    await aprovar({ ...item, versao: 2 }).expect(409);
    expect(await estado(item)).toEqual(antes);
    await aprovar({ ...item, id: 2147483647 }).expect(404);
  });

  it('protege aprovação por papel e recusa campos controlados pelo servidor', async () => {
    const item = await criar();
    const antes = await estado(item);
    const body = { versaoSolicitacao: 1, versaoCentroCusto: 1 };
    await request(app.getHttpServer() as Server)
      .patch(`/solicitacoes/${item.id}/aprovar`)
      .send(body)
      .expect(401);
    for (const papel of ['solicitante', 'auditor']) {
      const token = app.get(JwtService).sign({ sub: 2, papel });
      await decidir(item.id, body, token, 'aprovar').expect(403);
    }
    for (const extra of [
      { atorId: 999 },
      { status: 'aprovada' },
      { saldoResultanteCentavos: 0 },
      { valorReservadoCentavos: 1 },
    ]) {
      await decidir(item.id, { ...body, ...extra }, gestor, 'aprovar').expect(
        400,
      );
    }
    for (const invalido of [
      {},
      { versaoSolicitacao: 1 },
      { ...body, versaoCentroCusto: 0 },
      { ...body, versaoSolicitacao: 1.5 },
    ]) {
      await decidir(item.id, invalido, gestor, 'aprovar').expect(400);
    }
    for (const valorEstimadoCentavos of [-1, 1.5]) {
      await request(app.getHttpServer() as Server)
        .post('/solicitacoes')
        .auth(gestor, { type: 'bearer' })
        .send({
          titulo: 'Valor inválido',
          centroCusto: item.centroCusto,
          valorEstimadoCentavos,
        })
        .expect(400);
    }
    expect(await estado(item)).toEqual(antes);
  });

  it('desconta uma única vez em duas aprovações simultâneas', async () => {
    const item = await criar();
    const resultados = await Promise.all([aprovar(item), aprovar(item)]);
    expect(resultados.map((r) => r.status).sort()).toEqual([200, 409]);
    const atual = await estado(item);
    expect(atual.centro).toMatchObject({
      saldoDisponivelCentavos: 380000,
      versao: 2,
    });
    expect(atual.solicitacao).toMatchObject({ status: 'aprovada', versao: 2 });
    expect(atual.auditorias).toHaveLength(1);
  });

  it('impede duas solicitações de consumirem a mesma versão do orçamento', async () => {
    const primeira = await criar(300000);
    const segunda = await criar(300000, primeira.centroCusto);
    const resultados = await Promise.all([aprovar(primeira), aprovar(segunda)]);
    expect(resultados.map((r) => r.status).sort()).toEqual([200, 409]);
    const estados = await Promise.all([estado(primeira), estado(segunda)]);
    expect(estados.map((e) => e.solicitacao.status).sort()).toEqual([
      'aprovada',
      'pendente',
    ]);
    expect(estados[0].centro).toMatchObject({
      saldoDisponivelCentavos: 200000,
      versao: 2,
    });
    expect(estados.reduce((total, e) => total + e.auditorias.length, 0)).toBe(
      1,
    );
  });

  it('desfaz saldo, versões e aprovação se a auditoria falhar', async () => {
    const item = await criar();
    const antes = await estado(item);
    await db.query(
      `ALTER TABLE auditorias ADD CONSTRAINT falha_reserva_teste CHECK (recurso_id <> ${item.id})`,
    );
    try {
      app.useLogger(false);
      await aprovar(item).expect(500);
      expect(await estado(item)).toEqual(antes);
    } finally {
      await db.query(
        'ALTER TABLE auditorias DROP CONSTRAINT falha_reserva_teste',
      );
    }
  });

  it('seed repetido preserva orçamento utilizado, decisões e versões', async () => {
    const seed = () =>
      execFileSync(
        process.execPath,
        ['-r', 'ts-node/register', 'src/database/seeds/solicitacoes.seed.ts'],
        {
          env: { ...process.env, SEED_CENTRO_CUSTO: 'CC-SEED-13' },
          stdio: 'pipe',
        },
      );
    seed();
    const item = await db.getRepository(Solicitacao).findOneByOrFail({
      centroCusto: 'CC-SEED-13',
      valorEstimadoCentavos: 120000,
    });
    await aprovar(item).expect(200);
    const antes = await estado(item);
    seed();
    expect(await estado(item)).toEqual(antes);
    expect(
      await db
        .getRepository(Solicitacao)
        .countBy({ centroCusto: 'CC-SEED-13' }),
    ).toBe(2);
  }, 30000);

  it('banco impede valores negativos e referências a centros inexistentes', async () => {
    const item = await criar();
    await expect(
      db.query(
        'UPDATE solicitacoes SET valor_estimado_centavos = -1 WHERE id = $1',
        [item.id],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        'UPDATE centros_custo SET saldo_disponivel_centavos = -1 WHERE codigo = $1',
        [item.centroCusto],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "UPDATE solicitacoes SET centro_custo = 'INEXISTENTE' WHERE id = $1",
        [item.id],
      ),
    ).rejects.toThrow();
    await expect(
      db.query('DELETE FROM centros_custo WHERE codigo = $1', [
        item.centroCusto,
      ]),
    ).rejects.toThrow();
    await db.query('UPDATE centros_custo SET codigo = $1 WHERE codigo = $2', [
      'CC-RENOMEADO',
      item.centroCusto,
    ]);
    expect(
      (await db.getRepository(Solicitacao).findOneByOrFail({ id: item.id }))
        .centroCusto,
    ).toBe('CC-RENOMEADO');
  });

  it('reverte evolução, migra dados antigos e recria todo o schema sem synchronize', async () => {
    await db.undoLastMigration();
    await db.query(`INSERT INTO solicitacoes (titulo, centro_custo, valor_estimado_centavos, versao)
      VALUES ('Registro legado', 'CC-LEGADO', 100, 1)`);
    await db.runMigrations();
    expect(
      await db
        .getRepository(CentroCusto)
        .findOneByOrFail({ codigo: 'CC-LEGADO' }),
    ).toMatchObject({ saldoDisponivelCentavos: 0, versao: 1 });
    expect(
      await db
        .getRepository(Solicitacao)
        .findOneByOrFail({ centroCusto: 'CC-LEGADO' }),
    ).toMatchObject({
      titulo: 'Registro legado',
      valorEstimadoCentavos: 100,
      prioridade: 'normal',
    });
    await db.undoLastMigration();
    await db.undoLastMigration();
    expect(
      await db.query("SELECT to_regclass('public.solicitacoes') AS tabela"),
    ).toEqual([{ tabela: null }]);
    await db.runMigrations();
    expect(await db.showMigrations()).toBe(false);
    const item = await criar();
    await aprovar(item).expect(200);
    // Entidades e migrations descrevem o mesmo schema para futuras gerações.
    expect((await db.driver.createSchemaBuilder().log()).upQueries).toEqual([]);
  });
});
