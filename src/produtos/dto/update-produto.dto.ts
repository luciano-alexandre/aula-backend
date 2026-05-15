import { IsBoolean, IsNumber, IsOptional, IsString, Min } from "class-validator";


export class UpdateProdutoDto {
    
    @IsOptional()
    @IsString()
    nome?: string;

    @IsOptional()
    @IsString()
    categoria?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    preco?: number;

    @IsOptional()
    @IsBoolean()
    ativo?: boolean;
    
}