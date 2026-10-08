import {
  Column,
  JoinColumn,
  ManyToOne,
  Check,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

import { CentroCusto } from '../centros-custo/centro-custo.entity';

export type StatusSolicitacao = 'pendente' | 'aprovada' | 'rejeitada';

@Entity({ name: 'solicitacoes' })
@Check(
  'CHK_solicitacoes_status',
  "status IN ('pendente', 'aprovada', 'rejeitada')",
)
@Check('CHK_solicitacoes_valor_estimado', '"valor_estimado_centavos" >= 0')
export class Solicitacao {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 150 })
  titulo!: string;

  @Column({ type: 'varchar', length: 20, default: 'pendente' })
  status!: StatusSolicitacao;

  @Column({ type: 'varchar', length: 20, default: 'normal' })
  prioridade!: string;

  @Column({ name: 'valor_estimado_centavos', type: 'integer', default: 0 })
  valorEstimadoCentavos!: number;

  @Column({ name: 'centro_custo', type: 'varchar', length: 30 })
  centroCusto!: string;

  @ManyToOne(() => CentroCusto, {
    nullable: false,
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'centro_custo',
    referencedColumnName: 'codigo',
    foreignKeyConstraintName: 'FK_solicitacoes_centro_custo',
  })
  centro!: CentroCusto;

  @VersionColumn({ name: 'versao', default: 1 })
  versao!: number;

  @CreateDateColumn({ name: 'criada_em', type: 'timestamptz' })
  criadaEm!: Date;

  @UpdateDateColumn({ name: 'atualizada_em', type: 'timestamptz' })
  atualizadaEm!: Date;
}
