import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProdutosModule } from './produtos/produtos.module';
import { TarefasModule } from './tarefas/tarefas.module';
import { ReservasModule } from './reservas/reservas.module';

@Module({
  imports: [ProdutosModule, TarefasModule, ReservasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
