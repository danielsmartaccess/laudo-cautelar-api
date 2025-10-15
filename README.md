# API Laudo Cautelar Automotivo

API em Node.js + TypeScript + Express + TypeORM para gerenciar Laudos Cautelares, com upload de fotos e cálculo de IPA.

## Requisitos

- Node.js 18+
- Docker (para Postgres) ou Postgres local

## Configuração

1. Crie um arquivo `.env` em `api-crud-produtos/` (baseado no `.env.example`):

```env
DB_TYPE=postgres
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=laudo_cautelar
PORT=3000
NODE_ENV=development
```

1. Instale dependências no diretório `api-crud-produtos`:

- `npm install`

1. Suba o Postgres via Docker (opcional, se não tiver Postgres local):

- No diretório `api-crud-produtos`, rode: `docker compose up -d`

Se você mudou usuário/senha do Postgres, apague volumes antigos para evitar erro 28P01:

- `docker compose down -v` (remove containers e volumes desse compose)
- `docker compose up -d`

1. Rode a API:

- `npm run dev`

Login padrão (dev):

- email: `admin@example.com`
- senha: `admin123`

Após o login em `/api/login`, use o token Bearer nas demais requisições.

## Endpoints principais

- GET `/api/status`
- GET `/api/laudos`
- GET `/api/laudos/:id`
- GET `/api/laudos/placa/:placa`
- POST `/api/laudos`
- PUT `/api/laudos/:id`
- DELETE `/api/laudos/:id`
- POST `/api/laudos/:id/fotos` (multipart/form-data, campo "fotos")
- GET `/api/laudos/:id/fotos`
- DELETE `/api/fotos/:id`
- POST `/api/login` (público)
- GET `/api/inspetores`
- GET `/api/inspetores/:id`
- POST `/api/inspetores`
- PUT `/api/inspetores/:id`
- DELETE `/api/inspetores/:id`

Uploads ficam em `/uploads/laudos/:id`. Os arquivos são servidos estaticamente em `/uploads`.

## Observações

- TypeORM está com `synchronize: true` e `logging: true` apenas para desenvolvimento.
- Em Windows, prefira `DB_HOST=127.0.0.1` com Docker para evitar problemas de resolução de `localhost`.
- O cálculo de IPA espelha a regra do frontend para manter consistência (ver função `calcIPA` em `src/app.ts`).

## Troubleshooting

- Erro de autenticação Postgres (28P01): senha/usuário divergentes do volume atual. Solução: `docker compose down -v` e subir novamente; alinhar `.env` e `docker-compose.yml`.
- Conflito de porta 5432 com Postgres local: pare o serviço "postgresql-x64-17" no Windows (Services.msc) ou execute como administrador: `sc stop postgresql-x64-17`. Depois suba o Docker e mantenha `DB_PORT=5432`.
- pgAdmin reiniciando com "Migration failed": remova o volume do pgAdmin (`docker compose down -v`) antes de subir de novo.
- TypeScript erro de caractere inválido no fim do arquivo: verifique se não há caracteres nulos; reescreva o arquivo.
