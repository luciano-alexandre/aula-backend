import { Check, Column, Entity, PrimaryColumn, VersionColumn } from 'typeorm';

@Entity({ name: 'centros_custo' })
@Check('CHK_centros_custo_saldo', '"saldo_disponivel_centavos" >= 0')
export class CentroCusto {
  @PrimaryColumn({ type: 'varchar', length: 30 })
  codigo!: string;

  @Column({ type: 'varchar', length: 100 })
  nome!: string;

  @Column({ name: 'saldo_disponivel_centavos', type: 'integer' })
  saldoDisponivelCentavos!: number;

  @VersionColumn({ name: 'versao', default: 1 })
  versao!: number;
}
