import { AuthModule } from '../auth/auth.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CentroCusto } from './centro-custo.entity';
import { CentrosCustoController } from './centros-custo.controller';
import { CentrosCustoService } from './centros-custo.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([CentroCusto])],
  controllers: [CentrosCustoController],
  providers: [CentrosCustoService],
})
export class CentrosCustoModule {}
