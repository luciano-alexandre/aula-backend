import { Injectable, NotFoundException } from '@nestjs/common';

type Reserva = {
  id: number;
  responsavel: string;
  sala: 'azul' | 'verde' | 'vermelha';
  turno: 'manha' | 'tarde' | 'noite';
  integrantes: number;
  status: 'ativa' | 'confirmada' | 'cancelada' | 'encerrada';
};

@Injectable()
export class ReservasService {
    private reservas: Reserva[] = [
        {id: 1, responsavel: 'Ana', sala: 'azul', turno: 'manha', integrantes: 3, status: 'ativa'},
        {id: 2, responsavel: 'Bruno', sala: 'verde', turno: 'tarde', integrantes: 5, status: 'confirmada'},
        {id: 3, responsavel: 'Carla', sala: 'vermelha', turno: 'noite', integrantes: 2, status: 'cancelada'}
    ];

    buscarPorId(id: number){
        const reserva = this.reservas.find((r) => r.id === id);

        if (!reserva) {
            throw new NotFoundException(`Reserva com id ${id} não encontrada`);
        }

        return reserva;
    }

    criar(dados : {
        responsavel: string;
        sala: 'azul' | 'verde' | 'vermelha';
        turno: 'manha' | 'tarde' | 'noite';
        integrantes: number;
    }){
        const novoId = 
            this.reservas.length > 0 
                ? Math.max(...this.reservas.map(r => r.id)) + 1 
                : 1;
        
        const novaReserva: Reserva = {
            id: novoId,
            responsavel: dados.responsavel,
            sala: dados.sala,
            turno: dados.turno,
            integrantes: dados.integrantes,
            status: 'ativa',
        }

        this.reservas.push(novaReserva);

        return novaReserva;
    }

    atualizarParcial(id: number, dados:{
        status?: 'ativa' | 'confirmada' | 'cancelada' | 'encerrada';
        integrantes?: number;
    }){
        const reservaAtual = this.buscarPorId(id);

        if(reservaAtual.status === 'cancelada' || reservaAtual.status === 'encerrada'){
            throw new NotFoundException('Não é possível atualizar uma reserva cancelada ou encerrada');
        }

        const reservaAtualizada : Reserva = {...reservaAtual, ...dados};
        this.reservas = this.reservas.map(r => r.id === id ? reservaAtualizada : r);

        return reservaAtualizada;
    }
}
