
# Documentação da API — GamAPI

## 1. Visão geral

A GamAPI disponibiliza endpoints REST para configurar elementos de gamificação, registrar atividades educacionais e consultar recompensas dos participantes.

A API foi desenvolvida utilizando NestJS e TypeScript e utiliza o padrão xAPI (Experience API) para representar eventos de aprendizagem.

**URL base de desenvolvimento:**
```text
http://localhost:3000
```

As requisições que enviam dados utilizam o formato JSON.
```http
Content-Type: application/json
```

A GamAPI utiliza o PostgreSQL para armazenar configurações e o Ralph LRS para armazenar statements xAPI.

## 2. Aplicações educacionais

### POST `/applications`

Cadastra uma nova aplicação educacional.

**Corpo da requisição:**
```json
{
  "name": "Aplicação Teste",
  "iri": "https://gamapi.dev/applications/aplicacao-teste"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | string | Sim | Nome da aplicação |
| `iri` | string | Sim | Identificador da aplicação |

**Resposta de sucesso — HTTP 201:**
```json
{
  "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "name": "Aplicação Teste",
  "iri": "https://gamapi.dev/applications/aplicacao-teste",
  "active": true
}
```

A IRI precisa ser única entre as aplicações cadastradas.

Uma tentativa de cadastrar outra aplicação com a mesma IRI retorna HTTP 409.

## 3. Projetos

### POST `/projects`

Cadastra um projeto vinculado a uma aplicação educacional existente.

**Corpo da requisição:**
```json
{
  "name": "Projeto de Engenharia de Hardware",
  "iri": "https://gamapi.dev/projects/project-hardware",
  "applicationId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | string | Sim | Nome do projeto |
| `iri` | string | Sim | Identificador do projeto |
| `applicationId` | UUID | Sim | ID da aplicação à qual pertence |

**Resposta de sucesso — HTTP 201:**
```json
{
  "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "name": "Projeto de Engenharia de Hardware",
  "iri": "https://gamapi.dev/projects/project-hardware",
  "applicationId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "active": true
}
```

A aplicação informada precisa existir e estar ativa.

O sistema também impede o cadastro de projetos com IRIs duplicadas.

### POST `/projects/:projectId/challenges`

Associa uma challenge já cadastrada a determinado projeto.

**Parâmetro da rota:**

| Parâmetro | Descrição |
|---|---|
| `projectId` | UUID do projeto |

**Corpo da requisição:**
```json
{
  "challengeId": "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
}
```

**Resposta de sucesso — HTTP 201:**
```json
{
  "linked": true
}
```

O projeto e a challenge precisam existir e estar ativos.

## 4. Challenges

### POST `/challenges`

Cadastra uma challenge e sua pontuação.

**Corpo da requisição:**
```json
{
  "name": "Testes de UX",
  "iri": "https://gamapi.dev/challenges/testes-de-ux",
  "points": 40
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | string | Sim | Nome da challenge |
| `iri` | string | Sim | Identificador da challenge |
| `points` | integer | Sim | Pontos atribuídos à conclusão |

**Resposta de sucesso — HTTP 201:**
```json
{
  "id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  "name": "Testes de UX",
  "iri": "https://gamapi.dev/challenges/testes-de-ux",
  "points": 40,
  "active": true
}
```

A pontuação precisa ser um número inteiro maior ou igual a zero.

### PATCH `/challenges/:id/points`

Atualiza a pontuação configurada para uma challenge.

**Corpo da requisição:**
```json
{
  "points": 50
}
```

**Resposta de sucesso — HTTP 200:**
```json
{
  "id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  "name": "Testes de UX",
  "iri": "https://gamapi.dev/challenges/testes-de-ux",
  "points": 50,
  "active": true
}
```

A alteração afeta a pontuação utilizada em novos processamentos. Os statements de recompensas já armazenados no Ralph não são reescritos.

### POST `/challenges/points`

Consulta a pontuação de uma challenge considerando a aplicação e o projeto informados em um statement xAPI.

**Corpo da requisição:** um statement de conclusão contendo as IRIs da challenge, da aplicação e do projeto.

**Resposta de sucesso — HTTP 201:**
```json
{
  "points": 40
}
```

Essa operação consulta a configuração de pontuação. Ela não registra a conclusão e não concede recompensas.

## 5. Statements xAPI

### POST `/statements`

Registra a conclusão de uma challenge e processa as recompensas correspondentes.

**Corpo da requisição:**
```json
{
  "id": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  "actor": {
    "name": "Participante Teste",
    "mbox": "mailto:participante@exemplo.com"
  },
  "verb": {
    "id": "http://adlnet.gov/expapi/verbs/completed",
    "display": {
      "en-US": "completed"
    }
  },
  "object": {
    "id": "https://gamapi.dev/challenges/testes-de-ux",
    "objectType": "Activity",
    "definition": {
      "type": "https://gamapi.dev/activity-types/challenge",
      "name": {
        "pt-BR": "Testes de UX"
      }
    }
  },
  "context": {
    "contextActivities": {
      "grouping": [
        {
          "id": "https://gamapi.dev/applications/aplicacao-teste",
          "objectType": "Activity",
          "definition": {
            "type": "https://gamapi.dev/activity-types/educational-application"
          }
        },
        {
          "id": "https://gamapi.dev/projects/project-hardware",
          "objectType": "Activity",
          "definition": {
            "type": "https://gamapi.dev/activity-types/project"
          }
        }
      ]
    }
  }
}
```

**Principais campos:**

| Campo | Descrição |
|---|---|
| `id` | UUID do statement original |
| `actor.mbox` | Identificação do participante |
| `actor.name` | Nome do participante, quando informado |
| `verb.id` | IRI que identifica a ação |
| `object.id` | IRI da challenge concluída |
| `object.definition.type` | Tipo de atividade xAPI |
| `context.contextActivities.grouping` | Contexto de aplicação e projeto |

A GamAPI aceita nesse fluxo o verbo `completed` associado a uma atividade do tipo `challenge`.

A aplicação e o projeto precisam estar identificados no contexto, e a challenge precisa estar cadastrada, ativa e associada ao projeto.

**Resposta de sucesso — HTTP 201:**

O endpoint retorna o statement da recompensa de pontos gerada ou reutilizada.

Exemplo ilustrativo:
```json
{
  "id": "eeeeeeee-eeee-5eee-8eee-eeeeeeeeeeee",
  "actor": {
    "name": "Participante Teste",
    "mbox": "mailto:participante@exemplo.com"
  },
  "verb": {
    "id": "https://gamapi.dev/verbs/earned-points",
    "display": {
      "en-US": "earned points"
    }
  },
  "object": {
    "id": "https://gamapi.dev/points",
    "objectType": "Activity",
    "definition": {
      "type": "https://gamapi.dev/activity-types/points",
      "name": {
        "en-US": "Points"
      }
    }
  },
  "result": {
    "extensions": {
      "https://gamapi.dev/extensions/points": 40
    }
  },
  "context": {
    "statement": {
      "objectType": "StatementRef",
      "id": "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
    }
  }
}
```

O `id` da recompensa é gerado deterministicamente pela GamAPI. O UUID mostrado acima é apenas ilustrativo.

O campo `context.statement.id` referencia o statement original que provocou a concessão dos pontos.

Além dos pontos, a operação avalia as regras das insígnias vinculadas ao projeto.

### GET `/statements/:id`

Consulta um statement pelo seu UUID.

**Exemplo:**
```http
GET /statements/dddddddd-dddd-4ddd-8ddd-dddddddddddd
```

**Resposta de sucesso — HTTP 200:**

Retorna o statement xAPI recuperado do Ralph.

### GET `/statements/all`

Retorna os statements originais de conclusão de um participante.

**Parâmetro de consulta:**

| Parâmetro | Tipo | Obrigatório |
|---|---|---|
| `mbox` | string | Sim |

**Exemplo:**
```http
GET /statements/all?mbox=mailto:participante@exemplo.com
```

**Resposta de sucesso — HTTP 200:**
```json
{
  "statements": [
    {
      "id": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      "actor": {
        "name": "Participante Teste",
        "mbox": "mailto:participante@exemplo.com"
      },
      "verb": {
        "id": "http://adlnet.gov/expapi/verbs/completed"
      },
      "object": {
        "id": "https://gamapi.dev/challenges/testes-de-ux"
      }
    }
  ]
}
```

Os elementos apresentados são um exemplo simplificado. Os statements reais podem conter outros campos definidos pelo xAPI e pelo LRS.

### GET `/statements/points/accumulated`

Consulta a pontuação acumulada de um participante.

**Exemplo:**
```http
GET /statements/points/accumulated?mbox=mailto:participante@exemplo.com
```

**Resposta de sucesso — HTTP 200:**
```json
{
  "points": 80
}
```

A pontuação é calculada somando os valores presentes nas extensões dos statements `earned-points` do participante.

Essa consulta não recebe um projeto como filtro; portanto, representa o total de pontos encontrados para o participante, independentemente do projeto.

## 6. Insígnias

### POST `/badges`

Cadastra uma insígnia vinculada a um projeto.

**Corpo da requisição:**
```json
{
  "name": "UX Master",
  "description": "Insígnia concedida após atingir os requisitos de UX.",
  "iri": "https://gamapi.dev/badges/testes-de-ux",
  "projectId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "ruleOperator": "ALL"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | string | Sim | Nome da insígnia |
| `description` | string | Sim | Descrição |
| `iri` | string | Sim | Identificador único |
| `projectId` | UUID | Sim | Projeto associado |
| `imageUrl` | string | Não | URL da imagem |
| `ruleOperator` | `ALL` ou `ANY` | Não | Operador das regras; padrão `ALL` |

O projeto e sua aplicação precisam estar ativos.

**Resposta de sucesso — HTTP 201:**

Retorna os dados da insígnia cadastrada, incluindo seu UUID, estado de ativação e regras.

### POST `/badges/:badgeId/rules`

Adiciona uma regra à insígnia.

A GamAPI oferece dois tipos de regra.

**Regra de pontuação mínima:**
```json
{
  "type": "POINTS_THRESHOLD",
  "requiredPoints": 50
}
```

O participante precisa acumular pelo menos 50 pontos no projeto.

**Regra de conclusão de challenge:**
```json
{
  "type": "CHALLENGE_COMPLETED",
  "challengeId": "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
}
```

O participante precisa ter concluído a challenge informada.

A challenge deve estar ativa e associada ao mesmo projeto da insígnia.

**Operadores:**

| Operador | Funcionamento |
|---|---|
| `ALL` | Todas as regras precisam ser cumpridas |
| `ANY` | Pelo menos uma regra precisa ser cumprida |

As regras são cadastradas em requisições separadas.

**Resposta de sucesso — HTTP 201:**

Retorna a regra cadastrada, incluindo seu identificador e os parâmetros correspondentes ao tipo.

### GET `/badges/earned`

Consulta as insígnias conquistadas por um participante.

**Exemplo:**
```http
GET /badges/earned?mbox=mailto:participante@exemplo.com
```

**Resposta de sucesso — HTTP 200:**
```json
{
  "mbox": "mailto:participante@exemplo.com",
  "total": 1,
  "badges": [
    {
      "badgeIri": "https://gamapi.dev/badges/testes-de-ux",
      "name": "UX Master",
      "description": "Insígnia concedida após atingir os requisitos de UX.",
      "earnedAt": "2026-11-15T16:33:33Z",
      "statementId": "ffffffff-ffff-5fff-8fff-ffffffffffff",
      "triggerStatementId": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      "projectIri": "https://gamapi.dev/projects/project-hardware",
      "applicationIri": "https://gamapi.dev/applications/aplicacao-teste"
    }
  ]
}
```

A resposta é construída a partir dos statements `earned-badge` armazenados no Ralph.

O processamento remove duplicações de apresentação considerando a IRI da insígnia e a IRI do projeto, preservando o registro da conquista mais antiga.

O campo `total` representa a quantidade de insígnias distintas retornadas.

## 7. Leaderboard

### GET `/projects/:projectId/leaderboard`

Retorna a classificação dos participantes de determinado projeto.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `projectId` | UUID | Sim | Projeto consultado |
| `limit` | integer | Não | Quantidade máxima de participantes |

O valor padrão de `limit` é 10. O sistema aceita valores inteiros entre 1 e 100.

**Exemplo:**
```http
GET /projects/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/leaderboard?limit=10
```

**Resposta de sucesso — HTTP 200:**
```json
{
  "projectId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "projectName": "Projeto de Engenharia de Hardware",
  "leaderboard": [
    {
      "position": 1,
      "name": "Ana",
      "mbox": "mailto:ana@exemplo.com",
      "points": 100
    },
    {
      "position": 2,
      "name": "Bruno",
      "mbox": "mailto:bruno@exemplo.com",
      "points": 80
    }
  ]
}
```

O ranking utiliza os statements do Ralph para identificar as conclusões pertencentes ao projeto e as recompensas associadas a elas.

Os pontos são agrupados pelo `actor.mbox`.

Os participantes são ordenados por pontuação decrescente. Em caso de empate, o critério secundário utilizado pelo código é a ordem alfabética do `mbox`.

## 8. Idempotência dos statements

O endpoint `POST /statements` implementa mecanismos de idempotência.

Isso significa que o reenvio do mesmo evento, com o mesmo UUID e conteúdo compatível, não deve produzir uma nova recompensa.

O processamento valida o evento recebido, consulta se o statement original já existe no Ralph e compara o conteúdo quando necessário. Em seguida, procura uma recompensa de pontos anteriormente vinculada à conclusão. Caso não exista, consulta a pontuação configurada, garante o registro do statement original, gera e registra a recompensa de pontos. Por fim, avalia as regras de insígnias do projeto.

O processamento considera três situações principais:

**Evento novo:** a conclusão é registrada, e as recompensas são processadas.

**Evento já existente:** a API identifica o statement original, verifica sua compatibilidade e reutiliza as recompensas já registradas.

**Processamento incompleto:** quando a conclusão foi registrada, mas sua recompensa ainda não existe, a API pode continuar a operação pendente.

Os statements de recompensa utilizam identificadores determinísticos, contribuindo para evitar duplicações durante reenvios e requisições concorrentes.

Quando um UUID já pertence a um statement incompatível, a API retorna HTTP 409.

A implementação não utiliza transações distribuídas entre os sistemas de armazenamento. Portanto, falhas de integração e disponibilidade de leitura do LRS precisam ser consideradas pelos clientes.

## 9. Respostas de erro

A GamAPI utiliza exceções HTTP do NestJS para representar erros de validação, recursos inexistentes e conflitos.

| Status HTTP | Situação |
|---|---|
| `400 Bad Request` | Parâmetros ausentes, valores inválidos ou formato não suportado |
| `404 Not Found` | Recurso necessário não encontrado ou inativo, conforme o caso de uso |
| `409 Conflict` | Identificador duplicado ou conteúdo incompatível |
| `500 Internal Server Error` | Falha interna não tratada |
| `502 Bad Gateway` | Resposta inválida de um serviço externo, quando tratada dessa forma |
| `503 Service Unavailable` | Indisponibilidade temporária em situações tratadas pela aplicação |

**Exemplo de erro por conflito:**
```json
{
  "message": "Já existe um statement xAPI com este identificador e conteúdo diferente.",
  "error": "Conflict",
  "statusCode": 409
}
```

As mensagens específicas podem mudar conforme as padronizações realizadas no código.

Erros provenientes do Ralph ou de outras dependências também podem afetar a resposta da requisição.

## 10. Observações sobre a implementação

- Os IDs internos das configurações são UUIDs; as atividades nos statements são identificadas por IRIs.

- O participante é identificado principalmente por `actor.mbox`.

- O cliente deve reutilizar o UUID original quando reenviar a mesma ocorrência.

- Conclusões distintas devem possuir UUIDs distintos.

- As pontuações e as insígnias concedidas são registradas como novos statements no Ralph.

- A configuração atual não possui uma interface Swagger integrada.

- A documentação descreve os endpoints disponíveis na versão analisada do projeto, não uma versão formalmente publicada ou estável da API.

- Os tipos TypeScript usados nos controllers não substituem, por si só, validações de entrada em tempo de execução.

- A validação de parâmetros é realizada conforme cada caso de uso; a API não aplica automaticamente validação de UUID ou formatos a todos os parâmetros de rota e consulta.

- A autenticação dos clientes da GamAPI ainda não está implementada nos controllers analisados. As credenciais configuradas para o Ralph são utilizadas na comunicação da GamAPI com o LRS.

## 11. Referências internas

Para compreender a estrutura e as decisões do projeto, consulte:

- `README.md` — apresentação e instalação.

- `docs/ARQUITETURA.md` — organização do código, persistência e fluxos.

- `prisma/schema.prisma` — modelagem do PostgreSQL.

- `src/xapi/domain/xapi.constants.ts` — identificadores xAPI.
