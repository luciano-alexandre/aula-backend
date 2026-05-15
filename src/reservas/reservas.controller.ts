import { Body, Controller, Post, Patch, BadRequestException, Param } from '@nestjs/common';
import { ReservasService } from './reservas.service';


@Controller('reservas')
export class ReservasController {
    constructor(private readonly reservasService: ReservasService) { }

    @Post()
    criar(
        @Body()
        body: {
            responsavel: string;
            sala: string;
            turno: string;
            integrantes: number;
        }
    ) {
        // validações
        if (!body.responsavel || !body.sala || !body.turno || !body.integrantes === undefined) {
            throw new BadRequestException('Todos os campos são obrigatórios');
        }

        if (typeof body.integrantes !== 'number' || !Number.isInteger(body.integrantes)) {
            throw new BadRequestException('Integrantes deve ser um número inteiro');
        }

        if(body.integrantes < 1 || body.integrantes > 6){
            throw new BadRequestException('Integrantes deve ser entre 1 e 6');
        }

        const salasPermitidas = ['azul', 'verde', 'vermelha'];
        if (!salasPermitidas.includes(body.sala)) {
            throw new BadRequestException("Sala não permitida.");
        }

        const turnosPermitidos = ['manha', 'tarde', 'noite'];
        if (!turnosPermitidos.includes(body.turno)) {
            throw new BadRequestException("Turno não permitido.");
        }

        
        return this.reservasService.criar(body as {
            responsavel: string;
            sala: 'azul' | 'verde' | 'vermelha';
            turno: 'manha' | 'tarde' | 'noite';
            integrantes: number;
        });
    }

    @Patch(':id')
    atualizarParcial(
        @Param('id') id: string,
        @Body()
        body: {
            integrantes?: number;
            status?: string;
        }
    ){
        const idNumero = Number(id);

        if(Number.isNaN(idNumero)){
            throw new BadRequestException('ID deve ser um número');
        }

        if(Object.keys(body).length === 0){
            throw new BadRequestException('Pelo menos um campo deve ser fornecido para atualização');
        }
    }
}
