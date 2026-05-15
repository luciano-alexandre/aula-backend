import { IsBoolean, Min, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateProdutoDto {
  
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsString()
  @IsNotEmpty()
  categoria!: string;
  
  @IsNumber()
  @Min(0)
  preco!: number;

  @IsBoolean()
  ativo!: boolean;
}
