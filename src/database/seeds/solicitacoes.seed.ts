import 'dotenv/config';
import dataSource from '../data-source';
import { CentroCusto } from '../../centros-custo/centro-custo.entity';
import { Solicitacao } from '../../solicitacoes/solicitacao.entity';

const codigoCentroCusto = process.env.SEED_CENTRO_CUSTO ?? 'CC-1234';

async function executar() {
  await dataSource.initialize();

  const centros = dataSource.getRepository(CentroCusto);
  const solicitacoes = dataSource.getRepository(Solicitacao);

  const centroExistente = await centros.findOneBy({
    codigo: codigoCentroCusto,
  });

  if (!centroExistente) {
    await centros.save(
      centros.create({
        codigo: codigoCentroCusto,
        nome: 'Centro de custo da atividade',
        saldoDisponivelCentavos: 500000,
      }),
    );
  }

  const dados = [
    {
      titulo: 'Aquisição de monitor - prática 2',
      valorEstimadoCentavos: 120000,
    },
    {
      titulo: 'Aquisição de servidor - prática 2',
      valorEstimadoCentavos: 600000,
    },
  ];

  for (const item of dados) {
    const existente = await solicitacoes.findOneBy({
      titulo: item.titulo,
      centroCusto: codigoCentroCusto,
    });

    if (!existente) {
      await solicitacoes.save(
        solicitacoes.create({
          ...item,
          centroCusto: codigoCentroCusto,
          prioridade: 'normal',
          status: 'pendente',
        }),
      );
    }
  }

  await dataSource.destroy();
}

executar().catch(async (erro) => {
  console.error(erro);

  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }

  process.exitCode = 1;
});
