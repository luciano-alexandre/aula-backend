import { IsString, MaxLength, MinLength } from "class-validator";

export class CriarSolicitacaoDto {
    @IsString()
    @MinLength(5)
    @MaxLength(150)
    titulo!: string;
}