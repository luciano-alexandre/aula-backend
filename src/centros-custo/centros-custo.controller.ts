import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CentrosCustoService } from './centros-custo.service';

@Controller('centros-custo')
export class CentrosCustoController {
  constructor(private readonly service: CentrosCustoService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':codigo')
  buscarPorCodigo(@Param('codigo') codigo: string) {
    return this.service.buscarPorCodigo(codigo);
  }
}
