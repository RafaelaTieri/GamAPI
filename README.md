
# GamAPI

A GamAPI é uma API de gamificação voltada ao contexto educacional, desenvolvida para permitir que diferentes aplicações integrem funcionalidades de gamificação por meio de eventos padronizados no formato xAPI (*Experience API*).

A API recebe eventos de conclusão de desafios e realiza o processamento de recompensas, incluindo pontuação e insígnias. Também disponibiliza funcionalidades para consulta de histórico, pontuação acumulada e classificação de participantes.

O projeto é desenvolvido como parte de um Trabalho de Conclusão de Curso (TCC) em Ciência da Computação.

## Tecnologias utilizadas

| Tecnologia | Finalidade |
| --- | --- |
| Node.js | Ambiente de execução |
| TypeScript | Linguagem de programação |
| NestJS | Framework para desenvolvimento da API |
| PostgreSQL | Armazenamento das configurações de gamificação |
| Prisma | ORM para acesso ao PostgreSQL |
| Ralph LRS | Armazenamento dos statements xAPI |
| Jest | Framework de testes automatizados |

## Funcionalidades

- Cadastro de aplicações educacionais, projetos e desafios.
- Configuração da pontuação atribuída aos desafios.
- Associação de desafios a projetos.
- Recebimento e validação de statements xAPI.
- Geração automática de recompensas de pontos.
- Cadastro de insígnias com regras de concessão.
- Avaliação de regras por pontuação acumulada ou conclusão de desafios.
- Consulta de insígnias conquistadas e histórico de atividades.
- Classificação dos participantes por pontuação em cada projeto.
- Processamento idempotente de statements e recompensas.

## Arquitetura

O projeto é organizado em módulos por funcionalidade, utilizando separação de responsabilidades entre três camadas:

| Camada | Responsabilidade |
| --- | --- |
| `domain` | Entidades, tipos e contratos |
| `application` | Casos de uso e orquestração das regras de negócio |
| `infra` | Controllers, gateways e integrações externas |

A aplicação utiliza dois sistemas de armazenamento com finalidades diferentes:

- **PostgreSQL:** configurações das aplicações, projetos, desafios, insígnias e regras de concessão.
- **Ralph LRS:** statements xAPI das atividades realizadas e recompensas concedidas.

### Principais módulos

| Módulo | Responsabilidade |
| --- | --- |
| `configuration` | Configuração de aplicações, projetos e desafios |
| `challenges` | Consulta da pontuação associada aos desafios |
| `statements` | Processamento e consulta de statements xAPI |
| `badges` | Cadastro, avaliação e concessão de insígnias |
| `leaderboard` | Classificação de participantes por projeto |
| `idempotency` | Prevenção de duplicações e recuperação de processamentos incompletos |
| `database` | Integração com PostgreSQL por meio do Prisma |
| `xapi` | Constantes de verbos, tipos de atividades e extensões xAPI |

Consulte [a documentação de arquitetura](docs/ARQUITETURA.md) para mais detalhes sobre as camadas, os fluxos e as decisões técnicas.

## Instalação e execução

### Pré-requisitos

É necessário ter Node.js, npm, PostgreSQL e uma instância funcional do Ralph LRS.

O Ralph utilizado no ambiente de desenvolvimento é executado com Docker e WSL.

### Instalar dependências

Na raiz do projeto, execute:

```bash
npm ci
```

### Configurar as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as configurações necessárias:

```dotenv
DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5432/gam_api?schema=public"
LRS_URL=http://localhost:8100
LRS_USERNAME=USUARIO_DO_RALPH
LRS_PASSWORD=SENHA_DO_RALPH
```

Substitua os valores de exemplo pelas credenciais do seu ambiente. O arquivo `.env` não deve ser versionado, pois contém informações sensíveis.

### Preparar o banco de dados

Com o PostgreSQL em execução, aplique as migrations:

```bash
npx prisma migrate deploy
```

Gere o cliente Prisma:

```bash
npx prisma generate
```

Opcionalmente, execute o seed de dados de exemplo, caso o script esteja configurado:

```bash
npm run prisma:seed
```

### Iniciar o Ralph LRS

No ambiente de desenvolvimento, entre na pasta do Ralph e inicialize os serviços conforme sua configuração. Os comandos usados no ambiente local incluem:

```bash
docker compose up -d
make run
```

Para verificar a disponibilidade do LRS:

```bash
curl http://localhost:8100/__heartbeat__
```

### Iniciar a GamAPI

Com PostgreSQL e Ralph em execução:

```bash
npm run start:dev
```

Por padrão, a aplicação estará disponível em:

```text
http://localhost:3000
```

## Principais endpoints

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/applications` | Cadastrar aplicação |
| POST | `/projects` | Cadastrar projeto |
| POST | `/challenges` | Cadastrar desafio |
| POST | `/projects/:projectId/challenges` | Associar desafio a projeto |
| PATCH | `/challenges/:id/points` | Atualizar pontuação de desafio |
| POST | `/challenges/points` | Consultar pontuação de um desafio a partir de um statement |
| POST | `/statements` | Registrar conclusão e processar recompensas |
| GET | `/statements/:id` | Consultar statement por identificador |
| GET | `/statements/all` | Consultar conclusões por participante |
| GET | `/statements/points/accumulated` | Consultar pontuação acumulada |
| POST | `/badges` | Cadastrar insígnia |
| POST | `/badges/:badgeId/rules` | Cadastrar regra de concessão |
| GET | `/badges/earned` | Consultar insígnias conquistadas |
| GET | `/projects/:projectId/leaderboard` | Consultar ranking de um projeto |

As consultas de histórico, pontos acumulados e insígnias utilizam o parâmetro `mbox` para identificar o participante. O leaderboard recebe `projectId` na rota e aceita o parâmetro opcional `limit` (padrão: 10; valores inteiros de 1 a 100).

Consulte [a documentação da API](docs/API.md) para exemplos de requisição e resposta, parâmetros e erros HTTP.

## Processamento de statements

A GamAPI recebe statements xAPI com o verbo `completed`, representando a conclusão de um desafio.

Ao receber o evento, a API valida o conteúdo e verifica se o statement original ou uma recompensa correspondente já estão registrados no Ralph. Quando a recompensa de pontos ainda não existe, consulta a pontuação configurada para o desafio, garante o registro do statement original e gera a recompensa de pontos. Em seguida, avalia as regras das insígnias do projeto e registra as conquistas elegíveis.

O endpoint `POST /statements` retorna o statement de recompensa de pontos gerado ou reutilizado.

### Idempotência

A API implementa mecanismos de idempotência para evitar recompensas duplicadas quando um mesmo evento é enviado mais de uma vez.

O processamento utiliza identificadores determinísticos para as recompensas, consultas aos statements existentes e tratamento de conflitos de gravação. Também permite retomar processamentos que foram interrompidos após o registro de uma conclusão, mas antes da criação da recompensa correspondente.

Reenvios devem utilizar o mesmo UUID do evento original e manter conteúdo compatível. O sistema não utiliza transações distribuídas entre PostgreSQL e Ralph LRS; falhas de integração e a disponibilidade das consultas ao LRS devem ser consideradas pelos clientes.

## Testes e qualidade

O projeto possui testes unitários com Jest para os módulos funcionais de gamificação, incluindo casos de uso, controllers e gateways. Os testes ficam, em geral, em `src/<modulo>/<camada>/__test__/` e utilizam mocks para isolar dependências como Prisma e Ralph LRS.

Execute todos os testes unitários:

```bash
npm test -- --runInBand
```

Gere um relatório de cobertura:

```bash
npm test -- --coverage --runInBand
```

Verifique o lint e os tipos TypeScript:

```bash
npm run lint
npx tsc --noEmit
```

O script `npm run lint` utiliza `--fix` e pode modificar arquivos automaticamente. Para verificar sem alterar os arquivos, execute:

```bash
npx eslint "{src,apps,libs,test}/**/*.ts"
```

A cobertura deve ser interpretada conforme os testes executados e os arquivos incluídos no relatório. Código gerado automaticamente pelo Prisma e declarações de tipos TypeScript não representam, por si, regras de negócio que demandem testes unitários. Testes de integração e E2E podem complementar os testes unitários para verificar a configuração dos módulos e os fluxos HTTP completos.

## Comandos disponíveis

| Comando | Finalidade |
| --- | --- |
| `npm run start:dev` | Executar em modo de desenvolvimento |
| `npm run build` | Compilar o projeto |
| `npm run lint` | Executar ESLint com correções automáticas |
| `npm run format` | Formatar os arquivos TypeScript |
| `npm run test` | Executar testes unitários |
| `npm run test:e2e` | Executar testes de ponta a ponta, quando configurados |
| `npx prisma generate` | Gerar o Prisma Client |

## Documentação adicional

- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — organização do código, persistência e fluxos de processamento.
- [`docs/API.md`](docs/API.md) — endpoints, exemplos e erros HTTP.
- [`prisma/schema.prisma`](prisma/schema.prisma) — modelo de dados do PostgreSQL.

## Licença

A decidir.
