import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CentroCusto } from './centro-custo.entity';

@Injectable()
export class CentrosCustoService {
  constructor(
    @InjectRepository(CentroCusto)
    private readonly repository: Repository<CentroCusto>,
  ) {}

  async buscarPorCodigo(codigo: string) {
    const centro = await this.repository.findOneBy({ codigo });

    if (!centro) {
      throw new NotFoundException('Centro de custo não encontrado');
    }

    return centro;
  }
}
