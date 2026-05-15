import { Injectable, BadRequestException } from "@nestjs/common";

type Tarefa = {
    id: number;
    titulo: string;
    descricao: string;
    status: 'aberta' | 'em_andamento' | 'concluida';
    prioridade: 'baixa' | 'media' | 'alta';
}

@Injectable()
export class TarefasService {
    private tarefas: Tarefa[] = [
        {
            id: 1,
            titulo: 'Configurar projeto',
            descricao: 'Instalar dependencias e validar o NestJS',
            status: 'concluida',
            prioridade: 'alta',
        },
        {
            id: 2,
            titulo: 'Criar modulo tarefas',
            descricao: 'Gerar module, controller e service',
            status: 'em_andamento',
            prioridade: 'alta',
        },
        {
            id: 3,
            titulo: 'Implementar listagem',
            descricao: 'Criar rota GET /tarefas',
            status: 'aberta',
            prioridade: 'media',
        },
        {
            id: 4,
            titulo: 'Testar no Thunder Client',
            descricao: 'Salvar requests da pratica',
            status: 'aberta',
            prioridade: 'baixa',
        },
    ];

    listar(status?: string, prioridade?: string){
        let resultado = [...this.tarefas];

        if(status){
            resultado = resultado.filter(t => t.status === status);
        }

        if(prioridade){
            resultado = resultado.filter(t => t.prioridade === prioridade);
        }

        return resultado;
    }

    buscarPorId(id: number){
        const tarefa = this.tarefas.find(t => t.id === id);

        if(!tarefa){
            throw new BadRequestException('Tarefa não encontrada');
        }

        return tarefa;
    }

    criar(dados: Omit<Tarefa, 'id'>){
        const novoId = this.tarefas.length > 0 
                ? Math.max(...this.tarefas.map(t => t.id)) + 1 : 1;

        const novaTarefa : Tarefa = {id: novoId, ...dados};    
        this.tarefas.push(novaTarefa);
        
        return novaTarefa;
    }

    atualizarParcial(id: number, dados: Partial<Omit<Tarefa, 'id'>>){
        const tarefa = this.buscarPorId(id);

        const tarefaAtualizada = {...tarefa, ...dados};

        this.tarefas = this.tarefas.map(t => t.id === id ? tarefaAtualizada : t);

        return tarefaAtualizada;
    }

    remover(id: number){
        const tarefa = this.buscarPorId(id);

        this.tarefas = this.tarefas.filter(t => t.id !== id);

        return {
            mensagem: `Tarefa de id ${tarefa.id} removida com sucesso`,
        };
    }
}