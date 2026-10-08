import {
  Controller,
  Get,
  Body,
  Req,
  Post,
  Param,
  Patch,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SolicitacoesService } from './solicitacoes.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CriarSolicitacaoDto } from './dto/criar-solicitacao.dto';
import { AprovarSolicitacaoDto } from './dto/aprovar-solicitacao.dto';
import { RejeitarSolicitacaoDto } from './dto/rejeitar-solicitacao.dto';

type RequisicaoAutenticada = {
  user: { id: number; papel: string };
};

@Controller('solicitacoes')
export class SolicitacoesController {
  constructor(private readonly solicitacoesService: SolicitacoesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  criar(@Body() dto: CriarSolicitacaoDto) {
    return this.solicitacoesService.criar(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  listar() {
    return this.solicitacoesService.listar();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.solicitacoesService.buscarPorId(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gestor')
  @Patch(':id/rejeitar')
  rejeitar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejeitarSolicitacaoDto,
    @Req() request: RequisicaoAutenticada,
  ) {
    return this.solicitacoesService.rejeitar(
      id,
      dto.versaoSolicitacao,
      request.user.id,
      dto.justificativa,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gestor')
  @Patch(':id/aprovar')
  aprovar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AprovarSolicitacaoDto,
    @Req() request: RequisicaoAutenticada,
  ) {
    return this.solicitacoesService.aprovar(
      id,
      dto.versaoSolicitacao,
      dto.versaoCentroCusto,
      request.user.id,
    );
  }
}
