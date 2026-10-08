import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CriarSolicitacaoDto } from './dto/criar-solicitacao.dto';
import { Solicitacao } from './solicitacao.entity';
import { DataSource } from 'typeorm';
import { CentroCusto } from '../centros-custo/centro-custo.entity';
import { Auditoria } from '../auditoria/auditoria.entity';

@Injectable()
export class SolicitacoesService {
  constructor(
    @InjectRepository(Solicitacao)
    private readonly repository: Repository<Solicitacao>,
    private readonly dataSource: DataSource,
  ) {}

  listar() {
    return this.repository.find({ order: { id: 'ASC' } });
  }

  async buscarPorId(id: number) {
    const solicitacao = await this.repository.findOneBy({ id });

    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    return solicitacao;
  }

  criar(dto: CriarSolicitacaoDto) {
    const solicitacao = this.repository.create({
      titulo: dto.titulo,
      prioridade: dto.prioridade,
      centroCusto: dto.centroCusto,
      valorEstimadoCentavos: dto.valorEstimadoCentavos,
      status: 'pendente',
    });
    return this.repository.save(solicitacao);
  }

  async aprovar(
    id: number,
    versaoSolicitacao: number,
    versaoCentroCusto: number,
    atorId: number,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const solicitacao = await manager.findOneBy(Solicitacao, { id });

      if (!solicitacao) {
        throw new NotFoundException('Solicitação não encontrada');
      }
      if (solicitacao.status !== 'pendente') {
        throw new ConflictException('Solicitação não está pendente');
      }
      if (solicitacao.versao !== versaoSolicitacao) {
        throw new ConflictException(
          'A solicitação foi alterada; consulte novamente',
        );
      }

      const centro = await manager.findOneBy(CentroCusto, {
        codigo: solicitacao.centroCusto,
      });

      if (!centro) {
        throw new NotFoundException('Centro de custo não encontrado');
      }
      if (centro.versao !== versaoCentroCusto) {
        throw new ConflictException(
          'O centro de custo foi alterado; consulte novamente',
        );
      }
      if (centro.saldoDisponivelCentavos < solicitacao.valorEstimadoCentavos) {
        throw new ConflictException('Saldo insuficiente');
      }

      const saldoAnterior = centro.saldoDisponivelCentavos;
      const saldoResultante = saldoAnterior - solicitacao.valorEstimadoCentavos;

      const atualizacaoCentro = await manager
        .createQueryBuilder()
        .update(CentroCusto)
        .set({
          saldoDisponivelCentavos: () => '"saldo_disponivel_centavos" - :valor',
          versao: () => '"versao" + 1',
        })
        .where('"codigo" = :codigo', { codigo: centro.codigo })
        .andWhere('"versao" = :versaoCentroCusto', {
          versaoCentroCusto,
        })
        .andWhere('"saldo_disponivel_centavos" >= :valor')
        .setParameters({
          valor: solicitacao.valorEstimadoCentavos,
        })
        .execute();

      if (atualizacaoCentro.affected !== 1) {
        throw new ConflictException(
          'Saldo ou versão foi alterado; consulte novamente',
        );
      }

      const atualizacaoSolicitacao = await manager
        .createQueryBuilder()
        .update(Solicitacao)
        .set({
          status: 'aprovada',
          versao: () => '"versao" + 1',
        })
        .where('"id" = :id', { id })
        .andWhere('"versao" = :versaoSolicitacao', {
          versaoSolicitacao,
        })
        .andWhere('"status" = :status', { status: 'pendente' })
        .execute();

      if (atualizacaoSolicitacao.affected !== 1) {
        throw new ConflictException(
          'A solicitação foi alterada; consulte novamente',
        );
      }

      await manager.insert(Auditoria, {
        atorId,
        acao: 'SOLICITACAO_APROVADA_COM_RESERVA',
        recursoTipo: 'solicitacao',
        recursoId: solicitacao.id,
        detalhes: {
          centroCusto: centro.codigo,
          valorReservadoCentavos: solicitacao.valorEstimadoCentavos,
          saldoAnteriorCentavos: saldoAnterior,
          saldoResultanteCentavos: saldoResultante,
          versaoSolicitacaoUtilizada: versaoSolicitacao,
          versaoCentroCustoUtilizada: versaoCentroCusto,
        },
      });

      return manager.findOneByOrFail(Solicitacao, { id });
    });
  }
  async rejeitar(
    id: number,
    versaoEsperadaSolicitacao: number,
    atorId: number,
    justificativa: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const solicitacao = await manager.findOneBy(Solicitacao, { id });

      if (!solicitacao) {
        throw new NotFoundException('Solicitação não encontrada');
      }
      if (solicitacao.status !== 'pendente') {
        throw new ConflictException('Solicitação não está pendente');
      }

      const resultado = await manager
        .createQueryBuilder()
        .update(Solicitacao)
        .set({ status: 'rejeitada', versao: () => 'versao + 1' })
        .where('id = :id', { id })
        .andWhere('versao = :versao', { versao: versaoEsperadaSolicitacao })
        .andWhere('status = :status', { status: 'pendente' })
        .execute();

      if (resultado.affected !== 1) {
        throw new ConflictException(
          'A solicitação foi alterada; consulte novamente',
        );
      }

      await manager.insert(Auditoria, {
        atorId,
        acao: 'SOLICITACAO_REJEITADA',
        recursoTipo: 'solicitacao',
        recursoId: id,
        detalhes: {
          statusAnterior: 'pendente',
          statusAtual: 'rejeitada',
          versaoAnterior: versaoEsperadaSolicitacao,
          versaoAtual: versaoEsperadaSolicitacao + 1,
          justificativa,
        },
      });

      return manager.findOneByOrFail(Solicitacao, { id });
    });
  }
}
