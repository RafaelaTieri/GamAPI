
# Arquitetura da GamAPI

## 1. Visão geral

A GamAPI é uma API de gamificação educacional desenvolvida com NestJS e TypeScript, com o objetivo de centralizar o processamento de eventos de aprendizagem e a concessão de recompensas.

A aplicação utiliza o padrão xAPI (Experience API) para representar eventos realizados pelos participantes, permitindo que diferentes aplicações educacionais compartilhem informações em um formato padronizado.

A arquitetura é organizada por módulos funcionais, com separação entre domínio, aplicação e infraestrutura.

O sistema utiliza dois mecanismos de persistência:

- **PostgreSQL:** armazenamento das configurações de gamificação, como aplicações, projetos, desafios, insígnias e regras.

- **Ralph LRS:** armazenamento dos statements xAPI, que registram as conclusões dos desafios e as recompensas concedidas.

## 2. Organização do código

O código-fonte fica na pasta `src/`, dividido por funcionalidades.

| Módulo          | Responsabilidade                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `configuration` | Cadastro de aplicações, projetos e desafios, associação de desafios aos projetos e atualização de pontuações             |
| `challenges`    | Consulta da pontuação de um desafio, considerando sua aplicação e seu projeto                                            |
| `statements`    | Validação, registro, geração e consulta de statements xAPI                                                               |
| `badges`        | Cadastro de insígnias, criação e avaliação de regras, concessão e consulta de conquistas                                 |
| `leaderboard`   | Cálculo e consulta da classificação dos participantes em um projeto                                                      |
| `idempotency`   | Identificação de eventos já processados, prevenção de recompensas duplicadas e recuperação de processamentos incompletos |
| `database`      | Configuração e disponibilização do Prisma Client                                                                         |
| `xapi`          | Centralização dos identificadores de verbos, tipos de atividades e extensões xAPI                                        |

O arquivo `main.ts` inicializa a aplicação NestJS, enquanto `app.module.ts` funciona como módulo raiz, responsável por reunir os módulos principais.

Os arquivos `*.module.ts` registram os controllers, casos de uso e gateways utilizados por cada funcionalidade, configurando suas dependências por meio do sistema de injeção de dependências do NestJS.

## 3. Separação em camadas

Os módulos seguem uma organização inspirada nos princípios de Clean Architecture e arquitetura em camadas.

### 3.1. Domínio (`domain/`)

A camada de domínio contém as definições de dados e os contratos utilizados pelas funcionalidades.

Nela encontramos:

- Entidades e tipos do domínio.

- Contratos abstratos dos gateways.

- Estruturas de entrada e saída utilizadas pelos casos de uso.

Por exemplo, `statements.entities.ts` define a estrutura dos statements xAPI, enquanto `statements.gateway.ts` estabelece as operações necessárias para consultar e armazenar esses registros.

O domínio não deve depender diretamente de detalhes do NestJS, Prisma ou das requisições HTTP ao Ralph.

### 3.2. Aplicação (`application/`)

A camada de aplicação contém os casos de uso (*\_Use Cases\_*).

Cada caso de uso representa uma operação do sistema e coordena as regras necessárias para executá-la.

Alguns exemplos são:

| Caso de uso                    | Responsabilidade                                              |
| ------------------------------ | ------------------------------------------------------------- |
| `CreateApplicationUseCase`     | Cadastrar uma aplicação educacional                           |
| `GetChallengePointsUseCase`    | Recuperar a pontuação configurada para um desafio             |
| `ValidateStatementUseCase`     | Validar um statement de conclusão                             |
| `CreateStatementUseCase`       | Coordenar o processamento de uma conclusão e suas recompensas |
| `EvaluateBadgeRulesUseCase`    | Avaliar os requisitos de uma insígnia                         |
| `ProcessEarnedBadgesUseCase`   | Coordenar a verificação e concessão de insígnias              |
| `GetProjectLeaderboardUseCase` | Calcular a classificação dos participantes de um projeto      |
| `IdempotentStatementUseCase`   | Controlar o registro idempotente de statements                |

Os casos de uso acessam os dados necessários por meio de contratos de gateways, evitando depender diretamente das implementações concretas de persistência.

### 3.3. Infraestrutura (`infra/`)

A camada de infraestrutura contém os elementos responsáveis pela comunicação da aplicação com o ambiente externo.

Ela inclui:

**Controllers:** recebem requisições HTTP, extraem parâmetros e acionam os casos de uso correspondentes.

**Prisma Gateways:** implementam o acesso às configurações armazenadas no PostgreSQL.

**HTTP Gateways:** realizam a comunicação com o Ralph LRS para consultar e armazenar statements xAPI.

Na GamAPI, os controllers ficam dentro de `infra/` porque representam adaptadores de entrada associados ao framework HTTP.

Essa organização é uma convenção adotada pelo projeto e não impede a separação das responsabilidades.

## 4. Persistência e modelagem de dados

### 4.1. PostgreSQL

O modelo de dados é definido no arquivo `prisma/schema.prisma`.

O Prisma é utilizado para mapear as entidades do sistema para as tabelas do PostgreSQL.

As principais entidades são:

| Entidade           | Descrição                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `Application`      | Representa uma aplicação educacional integrada à GamAPI                                      |
| `Project`          | Representa um projeto pertencente a uma aplicação                                            |
| `Challenge`        | Representa um desafio e sua pontuação configurada                                            |
| `ProjectChallenge` | Associa desafios a projetos                                                                  |
| `Badge`            | Representa uma insígnia vinculada a um projeto                                               |
| `BadgeRule`        | Define uma condição necessária para conquistar uma insígnia                                  |
| `User`             | Modelo de usuário presente no schema, sem associação direta com os statements no fluxo atual |

### 4.2. Relacionamentos

Uma `Application` pode possuir vários `Project`, enquanto cada projeto pertence a uma aplicação.

Um `Project` pode possuir vários desafios, e um mesmo `Challenge` pode participar de vários projetos. Esse relacionamento muitos-para-muitos é representado pela entidade intermediária `ProjectChallenge`.

Cada `Project` também pode possuir várias insígnias (`Badge`).

Uma insígnia pode possuir várias regras (`BadgeRule`), e uma regra do tipo `CHALLENGE_COMPLETED` pode estar associada a um desafio específico.

As entidades possuem identificadores UUID para uso interno. Aplicações, projetos, desafios e insígnias também possuem IRIs que permitem sua identificação nos statements xAPI.

### 4.3. Regras das insígnias

O sistema oferece dois tipos de regra:

| Tipo                  | Condição                                                        |
| --------------------- | --------------------------------------------------------------- |
| `POINTS_THRESHOLD`    | O participante precisa acumular uma quantidade mínima de pontos |
| `CHALLENGE_COMPLETED` | O participante precisa ter concluído um desafio específico      |

As regras são combinadas pelo operador configurado na insígnia:

- **`ALL`:** todas as regras precisam ser satisfeitas.

- **`ANY`:** pelo menos uma regra precisa ser satisfeita.

Uma insígnia inativa ou sem regras não é concedida.

### 4.4. Ralph LRS

O Ralph é responsável por armazenar os eventos xAPI, incluindo:

- Conclusões de desafios (`completed`).

- Recompensas de pontuação (`earned-points`).

- Conquistas de insígnias (`earned-badge`).

Os statements não são armazenados nas tabelas do PostgreSQL.

O participante é identificado nos statements pelo campo `actor.mbox`, e as consultas de histórico e recompensas utilizam essa identificação.

## 5. Estrutura dos statements xAPI

Um statement xAPI representa uma ação realizada por um participante.

Na GamAPI, seus elementos principais são:

| Elemento    | Descrição                                                             |
| ----------- | --------------------------------------------------------------------- |
| `id`        | UUID que identifica a ocorrência registrada                           |
| `actor`     | Participante responsável pela ação                                    |
| `verb`      | Identificador da ação realizada                                       |
| `object`    | Atividade ou recurso relacionado à ação                               |
| `context`   | Informações adicionais, incluindo aplicação e projeto                 |
| `result`    | Informações sobre o resultado, como a pontuação recebida              |
| `timestamp` | Momento em que a ação ocorreu, quando informado ou atribuído pelo LRS |

A aplicação utiliza IRIs para identificar os verbos, tipos de atividades e recursos de maneira padronizada.

As IRIs utilizadas pela GamAPI ficam centralizadas em `src/xapi/domain/xapi.constants.ts`.

As recompensas de pontos e insígnias fazem referência ao statement de conclusão por meio de `context.statement`, utilizando um objeto do tipo `StatementRef`.

Essa referência permite relacionar uma recompensa ao evento que a originou.

## 6. Fluxo de conclusão de um desafio

O processamento começa quando uma aplicação educacional envia um statement de conclusão para o endpoint `POST /statements`.

O fluxo implementado segue as etapas:

1. O `StatementsController` recebe o statement e chama o `CreateStatementUseCase`.

2. O `ValidateStatementUseCase` verifica os campos obrigatórios, o UUID e os tipos de atividade e verbo suportados.

3. O `IdempotentStatementUseCase` verifica se a conclusão já existe no Ralph e se o conteúdo corresponde ao evento recebido.

4. A aplicação procura uma recompensa de pontos já relacionada à conclusão.

5. Quando a recompensa ainda não existe, o `GetChallengePointsUseCase` consulta a pontuação do desafio no PostgreSQL, considerando a aplicação e o projeto informados.

6. O statement original é registrado ou reutilizado no Ralph.

7. Quando necessário, o `GeneratePointsStatementUseCase` cria o statement de recompensa e a camada de idempotência realiza sua gravação.

8. O `ProcessEarnedBadgesUseCase` consulta o histórico do participante, avalia as regras aplicáveis e concede as insígnias elegíveis.

9. A API retorna o statement correspondente à recompensa de pontos.

O processamento das insígnias considera também a conclusão e a recompensa atuais, evitando depender exclusivamente da disponibilidade imediata dos registros nas consultas do Ralph.

## 7. Idempotência

A GamAPI possui um módulo dedicado à idempotência dos statements e recompensas.

Seu objetivo é evitar que o reenvio de um evento já registrado provoque efeitos duplicados.

### Identificadores determinísticos

Os statements de recompensa utilizam identificadores gerados de maneira determinística.

Para pontos, o identificador é derivado do ID do statement original.

Para insígnias, o identificador considera o projeto, o participante e a IRI da insígnia.

Dessa forma, o processamento repetido dos mesmos dados produz o mesmo identificador de recompensa.

### Verificação de registros existentes

Antes de armazenar um statement, a API verifica se seu identificador já existe no Ralph.

Quando encontra um statement original com o mesmo ID, compara o conteúdo recebido com o registro existente.

Caso os dados sejam incompatíveis, retorna um conflito.

Para recompensas já registradas, o processamento procura reutilizar os statements existentes em vez de criar novas ocorrências.

A implementação também trata conflitos de gravação e situações em que uma conclusão foi registrada, mas a recompensa ainda não foi criada.

### Limitações

Os mecanismos de idempotência reduzem o risco de duplicações, mas a comunicação com o LRS envolve operações independentes e não utiliza uma transação distribuída entre PostgreSQL e Ralph.

O armazenamento e a disponibilidade de leitura dos statements também podem ocorrer em momentos diferentes.

Por isso, o processamento admite reenvios e possui verificações de consistência. Os testes realizados cobrem os principais cenários, mas não representam uma garantia absoluta para todas as condições de falha e concorrência.

## 8. Cálculo de pontuação e leaderboard

A pontuação de cada desafio é definida no PostgreSQL.

Quando o participante conclui um desafio, a GamAPI consulta a pontuação configurada e gera um statement `earned-points`.

O valor recebido é registrado na extensão xAPI:

`https://gamapi.dev/extensions/points`

O endpoint de pontuação acumulada consulta as recompensas de pontos do participante no Ralph e soma seus valores.

O leaderboard é calculado para um projeto específico.

Para isso, o sistema consulta os statements de conclusão e recompensa, identifica quais conclusões pertencem à aplicação e ao projeto solicitados e relaciona as recompensas às conclusões por seus identificadores.

Em seguida, agrega os pontos por participante (`actor.mbox`), ordena os resultados pela pontuação decrescente e retorna a classificação.

A pontuação do leaderboard é calculada com base nas recompensas registradas, e não simplesmente no valor atual configurado para o desafio.

## 9. Injeção de dependências

A GamAPI utiliza o mecanismo de injeção de dependências do NestJS.

Os casos de uso dependem de contratos abstratos de gateways. As implementações concretas são registradas nos módulos por meio de providers.

Por exemplo:

- `ChallengeGateway` é implementado por `ChallengePrismaGateway`.

- `ConfigurationGateway` é implementado por `ConfigurationPrismaGateway`.

- `LeaderboardGateway` é implementado por `LeaderboardHttpGateway`.

- `StatementIdempotencyGateway` é implementado por `StatementIdempotencyHttpGateway`.

Essa abordagem permite que as regras da aplicação sejam desenvolvidas sem depender diretamente dos detalhes de comunicação com os sistemas de armazenamento.

Também facilita a substituição das implementações concretas por mocks durante os testes automatizados.

## 10. Organização de arquivos auxiliares

Além dos módulos funcionais, o projeto contém:

| Caminho                 | Finalidade                                        |
| ----------------------- | ------------------------------------------------- |
| `prisma/schema.prisma`  | Define os modelos e relacionamentos do PostgreSQL |
| `prisma/migrations/`    | Contém as migrations do banco de dados            |
| `prisma/seed.ts`        | Script de inserção de dados iniciais              |
| `src/generated/prisma/` | Contém o cliente Prisma gerado automaticamente    |
| `src/main.ts`           | Inicializa a aplicação NestJS                     |
| `src/app.module.ts`     | Registra os módulos principais                    |
| `.env`                  | Configurações de conexão com PostgreSQL e Ralph   |
| `package.json`          | Dependências e scripts de execução                |
| `src/<módulo>/<camada>/__test__/` | Testes unitários Jest dos casos de uso, gateways e controllers |
| `test/` | Diretório para testes de integração/E2E e configuração relacionada, conforme evolução do projeto |

O `PrismaService` utiliza o cliente gerado em `src/generated/prisma/` e configura a conexão com o banco por meio da variável de ambiente `DATABASE_URL`.

## 11. Testes automatizados e qualidade

Os testes unitários são implementados com Jest e ficam próximos dos arquivos de código correspondentes, nas pastas `__test__` das camadas `application`, `domain` e `infra`.

Os testes dos casos de uso verificam regras de negócio, caminhos alternativos e tratamento de erros. As dependências externas são substituídas por mocks, permitindo exercitar os componentes sem conexões reais com PostgreSQL ou Ralph LRS. Os testes dos gateways verificam consultas Prisma, mapeamento de resultados, requisições HTTP e paginação; os testes dos controllers verificam delegação, respostas e propagação de erros.

Os arquivos de entidades que contêm somente tipos TypeScript não produzem lógica JavaScript executável para medição de cobertura. O mesmo cuidado vale para arquivos declarativos de módulos NestJS e código gerado em `src/generated/prisma/`. A cobertura deve ser interpretada conforme o escopo executado, sem confundir a cobertura de um módulo isolado com a cobertura geral do projeto.

Comandos utilizados para verificação:

```bash
npm test -- --runInBand
npm test -- --coverage --runInBand
npm run lint
npx tsc --noEmit
```

O comando `npm run lint` está configurado com `--fix` e pode modificar arquivos para aplicar correções automáticas. A execução de testes unitários com mocks não substitui testes de integração ou de ponta a ponta, que devem ser considerados para validar a configuração dos módulos e a comunicação entre serviços.

## 12. Considerações arquiteturais

A arquitetura da GamAPI busca manter as regras de gamificação separadas dos mecanismos de persistência e comunicação.

As principais decisões adotadas são:

- Utilizar módulos separados por funcionalidade.

- Centralizar os processos de negócio em casos de uso.

- Utilizar gateways abstratos para o acesso a dados.

- Armazenar configurações no PostgreSQL e eventos no Ralph LRS.

- Identificar atividades e recursos por meio de IRIs.

- Processar recompensas com mecanismos de idempotência.

- Preservar o histórico das recompensas concedidas.

Essa organização permite evoluir as regras de gamificação e integrar novas aplicações educacionais sem concentrar todas as responsabilidades em um único módulo.
