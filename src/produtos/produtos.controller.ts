import { BadRequestException, Controller, Get, Param, Query, Post, Body, Put } from '@nestjs/common';
import { ProdutosService } from './produtos.service';

@Controller('produtos')
export class ProdutosController {
    constructor(private readonly produtosService: ProdutosService) { }

    @Get()
    listar(@Query('categoria') categoria?: string) {
        if (!categoria) {
            return this.produtosService.listarTodos();
        }

        return this.produtosService.listarPorCategoria(categoria);
    }

    @Get(':id')
    buscarPorId(@Param('id') id: string) {
        const idNumero = Number(id);

        if (Number.isNaN(idNumero)) {
            throw new BadRequestException('O ID deve ser um número');
        }

        const produto = this.produtosService.buscarPorId(idNumero);

        if (!produto) {
            throw new BadRequestException('Produto não encontrado');
        }

        return produto;
    }

    @Post()
    criar(
        @Body()
        body: {
            nome: string;
            categoria: string;
            preco: number;
            ativo: boolean;
        }    
    ){
        return this.produtosService.criar(body);
    }

    @Put(':id')
    atualizarCompleto(
        @Param('id') id: string,
        @Body()
        body: {
          nome: string;
          categoria: string;
          preco: number;
          ativo: boolean;
        }
    ){
        const idNumero = Number(id);

        if (Number.isNaN(idNumero)) {
            throw new BadRequestException('O ID deve ser um número');
        }

        return this.produtosService.atualizarCompleto(idNumero, body);
    }
}
