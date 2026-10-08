import {
  IsOptional,
  IsInt,
  Min,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CriarSolicitacaoDto {
  @IsString()
  @MinLength(5)
  @MaxLength(150)
  titulo!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  centroCusto!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  prioridade?: string;

  @IsInt()
  @Min(0)
  valorEstimadoCentavos!: number;
}
