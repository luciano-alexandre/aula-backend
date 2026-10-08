<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

### Desenvolvimento com Docker

```bash
docker compose up -d --build
```

A API executa `npm ci` antes de iniciar, sincronizando o volume
`node_modules` com o `package-lock.json`. Isso também acontece quando o
contêiner é reiniciado. A inicialização requer acesso ao registro npm para
pacotes que não estejam em cache.

Para adicionar dependências, pare a API antes de modificar o volume compartilhado
e inicie novamente após a instalação:

```bash
docker compose stop api
docker compose run --rm --no-deps api npm install @nestjs/typeorm typeorm pg @nestjs/config
docker compose up -d api
```

O comando explícito `npm install` substitui o comando de inicialização do serviço
no contêiner temporário. O `--rm` remove apenas esse contêiner, preservando o volume
nomeado de dependências. Reiniciar a API após a instalação também reinicia o
compilador em modo watch, para que ele reconheça as novas dependências.

Não use `docker compose down -v` para atualizar dependências: esse comando também
remove o volume do PostgreSQL e seus dados.

```bash
$ npm install
```

## Gerar migrations

Na rede do Docker, o banco atende em `db:5432`. O mapeamento `127.0.0.1:5437:5432`
permite acesso pela máquina local em `localhost:5437`. A porta externa pode ser
alterada com `DB_EXTERNAL_PORT` no `.env`; dentro do Docker, mantenha `DB_PORT=5432`.

Com o banco em execução, gere uma migration em um contêiner temporário:

```bash
docker compose up -d db
docker compose run --rm --no-deps api npm run migration:generate -- src/database/migrations/NomeDaMigration
```

Se executar o comando diretamente na máquina, com as dependências instaladas:

```bash
DB_HOST=localhost DB_PORT=5437 npm run migration:generate -- src/database/migrations/NomeDaMigration
```

Após alterar variáveis do Compose, recrie a API com `docker compose up -d api`
para aplicar a configuração; apenas reiniciar o contêiner não atualiza as variáveis.

## Encontro 13: aprovação com reserva de orçamento

Implementação da [correção da Prática 2](https://github.com/luciano-alexandre/sistemas-corporativos/blob/main/docs/encontros/encontro-13.md).

Com o PostgreSQL disponível:

```bash
docker compose run --rm --no-deps api npm run migration:run
docker compose run --rm --no-deps api npm run seed
docker compose up -d api
```

O seed cria `CC-1234` com saldo inicial de `500000` centavos e duas solicitações:
monitor (`120000`) e servidor (`600000`). Para usar os quatro últimos dígitos da
matrícula, execute o seed com `-e SEED_CENTRO_CUSTO=CC-5678` antes de `api` no
comando Docker. Execuções repetidas não duplicam os registros nem restauram saldo,
status ou versões.

Consulte `GET /centros-custo/CC-1234` e `GET /solicitacoes` com JWT para obter as
versões atuais. Apenas um gestor pode aprovar:

```http
PATCH /solicitacoes/1/aprovar
Authorization: Bearer <token-do-gestor>
Content-Type: application/json

{
  "versaoSolicitacao": 1,
  "versaoCentroCusto": 1
}
```

A aprovação do monitor retorna 200, reserva `120000` centavos, deixa o saldo em
`380000` e incrementa as duas versões. A auditoria registra ator do JWT, centro,
valor, saldo anterior, saldo resultante e versões utilizadas. As três gravações
usam a mesma transação; uma falha desfaz todas. Saldo insuficiente, versão antiga
ou solicitação já decidida retornam 409. Acesso sem JWT retorna 401; usuário sem
papel gestor recebe 403. Campos extras enviados no corpo são recusados com 400.

A criação de solicitações recebe `titulo`, `centroCusto`, `valorEstimadoCentavos`
e, opcionalmente, `prioridade` (padrão `normal`). O valor é inteiro e não negativo.
O centro deve existir. O campo `status` é definido pela aplicação.

A migration inicial existente já cria as três tabelas e o valor estimado. A
migration `GarantirIntegridadeOrcamento1790630000000` acrescenta prioridade,
valores padrão, restrições contra saldo/valor negativos e a chave estrangeira.
Antes de criar a chave, ela cadastra com saldo zero os centros referenciados por
solicitações antigas. O rollback dessa evolução preserva os registros e remove
as restrições, padrões e a coluna de prioridade adicionados. A configuração
continua com `synchronize: false`.

### Regressão da rejeição

A rejeição continua disponível para gestores em `PATCH /solicitacoes/:id/rejeitar`,
com `versaoSolicitacao`, `versaoCentroCusto` e `justificativa` de 10 a 200 caracteres.
O DTO existente exige ambas as versões; a rejeição verifica a versão da
solicitação e não altera o orçamento. A auditoria registra a justificativa.

### Validação automatizada

```bash
docker compose run --rm --no-deps api npm run build
docker compose run --rm --no-deps api npm run test:atividade13
```

A suíte cria e remove um banco temporário; o usuário PostgreSQL precisa ter
permissão de criar bancos. `test:atividade11` executa a mesma suíte, incluindo a
regressão de rejeição. São verificados os fluxos HTTP, autorização, versões,
saldo insuficiente, duas aprovações concorrentes, concorrência entre solicitações
do mesmo centro, falha real na gravação da auditoria, seed repetido, restrições
SQL, evolução de dados antigos e reversão/recriação completa das migrations.
A recriação ocorre somente no banco temporário, sem remover volumes do projeto.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
