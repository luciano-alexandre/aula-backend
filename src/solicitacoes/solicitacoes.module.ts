import { CentroCusto } from '../centros-custo/centro-custo.entity';
import { Module } from '@nestjs/common';
import { SolicitacoesController } from './solicitacoes.controller';
import { SolicitacoesService } from './solicitacoes.service';
import { AuthModule } from 'src/auth/auth.module';
import { Solicitacao } from './solicitacao.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auditoria } from '../auditoria/auditoria.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Solicitacao, Auditoria, CentroCusto]),
  ],
  controllers: [SolicitacoesController],
  providers: [SolicitacoesService],
})
export class SolicitacoesModule {}
