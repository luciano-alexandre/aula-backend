import {BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ProdutosService } from './produtos.service';

@Controller('produtos')
export class ProdutosController {
    constructor(private readonly produtosService: ProdutosService){}


    
    @Get()
    listar(@Query('categoria') categoria?: string){
        if(!categoria){
           return this.produtosService.listarTodos(); 
        } 
        
        return this.produtosService.listarPorCategoria(categoria);
        
    }
}
