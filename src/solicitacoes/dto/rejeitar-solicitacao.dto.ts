import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { AprovarSolicitacaoDto } from './aprovar-solicitacao.dto';

export class RejeitarSolicitacaoDto extends AprovarSolicitacaoDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(10, 200)
  justificativa!: string;
}
