import { BadRequestException, Controller, Get,  Post, Query, Param, Body, Patch, Delete } from "@nestjs/common";
import {TarefasService} from "./tarefas.service";

@Controller('tarefas')
export class TarefasController {
    constructor(private readonly tarefasService: TarefasService) { }

    @Get()
    listar(
        @Query('status') status?: string,
        @Query('prioridade') prioridade?: string,
    ){
        return this.tarefasService.listar(status, prioridade);
    }

    @Get(':id')
    buscarPorId(@Param('id') id: string){
        const idNumero = Number(id);

        if(Number.isNaN(idNumero)){
            throw new BadRequestException('ID deve ser um número');
        }

        return this.tarefasService.buscarPorId(idNumero);
    }

    @Post()
    criar(
        @Body()
        body:{
            titulo: string;
            descricao: string;
            status: 'aberta' | 'em_andamento' | 'concluida';
            prioridade: 'baixa' | 'media' | 'alta';
        }
    ){
        if(!body.titulo || !body.descricao || !body.status || !body.prioridade){
            throw new BadRequestException('Todos os campos são obrigatórios');
        }

        return this.tarefasService.criar(body);
    }

    @Patch(':id')
    atualizarParcial(
        @Param('id') id: string,
        @Body()
        body:{
            titulo?: string;
            descricao?: string;
            status?: 'aberta' | 'em_andamento' | 'concluida';
            prioridade?: 'baixa' | 'media' | 'alta';
        }
    ){
        const idNumero = Number(id);

        if(Number.isNaN(idNumero)){
            return new BadRequestException('ID deve ser um número');
        }

        if(Object.keys(body).length === 0){
            throw new BadRequestException('Pelo menos um campo deve ser fornecido para atualização');
        }

        return this.tarefasService.atualizarParcial(idNumero, body);
    }   

    @Delete(':id')
    remover(@Param('id') id: string){
        const idNumero = Number(id);

        if(Number.isNaN(idNumero)){
            throw new BadRequestException('ID deve ser um número');
        }

        return this.tarefasService.remover(idNumero);
    }
}