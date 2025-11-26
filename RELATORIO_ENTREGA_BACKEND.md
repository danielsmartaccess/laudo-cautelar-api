# Relatório de Entrega — Backend (API Laudo Cautelar)

Data: 15/10/2025
Versão da API: 1.2.0
Pasta: `api-crud-produtos/`

## Visão geral

API REST em Node.js + TypeScript para gestão de Laudos Cautelares de veículos, com:

- CRUD de Laudos, cálculo automático de IPA Score e notas (consistente com o frontend), agora encapsulado em Service.
- Upload e gestão de fotos por laudo (armazenamento em disco com Multer, validações e limites).
- CRUD completo de Inspetores e autenticação via JWT (login, proteção de rotas).
- Persistência em PostgreSQL via TypeORM.
- Servir estático de uploads e endpoint de status/saúde.

## Stack e arquitetura

- Plataforma: Node.js 18+, TypeScript, Express 5, TypeORM 0.3.x.
- Banco: PostgreSQL 17 (Docker Compose incluído); suporte a SQLite presente no package, mas não utilizado no runtime atual.
- ORM/Modelo de dados: TypeORM com entidades e relacionamentos.
- Upload: Multer (armazenamento local em `uploads/laudos/:id`).
- Configuração: `.env` (carregado em `src/data-source.ts` via `dotenv`).
- Build: `tsc` (outDir `dist/`, rootDir `src/`).
- Middlewares: CORS, JSON/urlencoded, estático em `/uploads`, autenticação JWT.

Estrutura de pastas (resumo):

- `src/app.ts`: boot da API, rotas (refatoradas para Services).
- `src/data-source.ts`: configuração do TypeORM com variáveis de ambiente.
- `src/entity/`: `Laudo`, `FotoLaudo`, `Inspetor`.
- `src/middleware/upload.ts`: storage + filtros Multer.
- `src/utils/validators.ts`: sanitização e validação de laudos (placa, VIN, numéricos).
 - `src/services/LaudoService.ts`: regras de negócio de laudos (validação + cálculo de IPA + CRUD).
 - `src/services/FotoLaudoService.ts`: regras de negócio para fotos do laudo (persistência e remoção física).

## Entidades e relacionamento

- Laudo
  - Identificação: `placa`, `vin`, `motor`, `anoModelo`, `inspetor`.
  - Estrutura/pintura/enchente/OBD/mecânica/testes: campos textuais com defaults.
  - Conclusão: `statusVeiculo`, `observacoesFinais`.
  - IPA: `ipaScore` (0–100, decimal), `ipaBadge`, `ipaNotas` (JSON array).
  - Timestamps: `criadoEm`, `atualizadoEm`.
- FotoLaudo
  - Metadados do arquivo: `nomeArquivo`, `caminhoArquivo`, `tamanhoArquivo`, `tipoMime`, `descricao`.
  - Relacionamento: `ManyToOne` com `Laudo` (onDelete: CASCADE).
  - Timestamp: `criadoEm`.
- Inspetor
  - `email` (unique), `nome`, `senha` (placeholder para hash), `telefone`, `registro`, `ativo`, timestamps.

Relacionamento principal: `Laudo (1) — (N) FotoLaudo`.

## Regras de negócio e validações

- Cálculo IPA (em `LaudoService`):
  - Deduz pontos conforme campos (estrutura, colisão, tonalidade, OBD, oxidação, etc.).
  - Gera `ipaScore`, `ipaBadge` (Verde/Amarelo/Laranja/Vermelho) e `ipaNotas` (lista textual).
  - Lógica espelha o frontend para consistência.
- Validações (`LaudoValidator`):
  - Placa Brasil: formatos antigo (ABC1234) e Mercosul (ABC1D23), com sanitização.
  - VIN: 17 caracteres válidos (exclui I, O, Q), com sanitização.
  - Obrigatórios: `placa`, `vin`, `inspetor`.
  - Numéricos: `pinturaEsp` (0–500 μm), `kmObd` (0–9.999.999).
- Atualização de laudo: recálculo automático do IPA antes do `save`.

## Endpoints implementados

- Saúde
  - GET `/api/status` → status, timestamp, version.
- Laudos
  - GET `/api/laudos` → lista (com `fotos`), ordenação por `criadoEm DESC`.
  - GET `/api/laudos/:id` → laudo por ID (com `fotos`).
  - GET `/api/laudos/placa/:placa` → busca por placa (normalizada em upper-case).
  - POST `/api/laudos` → cria laudo; valida dados; computa IPA; retorna registro salvo.
  - PUT `/api/laudos/:id` → atualiza laudo e recalcula IPA.
  - DELETE `/api/laudos/:id` → remove laudo.
- Fotos Laudo
  - POST `/api/laudos/:id/fotos` → upload múltiplo (`fotos`, até 10, 10MB cada; JPG/PNG/WEBP). Salva metadados em `FotoLaudo` e arquivos em `uploads/laudos/:id`.
  - GET `/api/laudos/:id/fotos` → lista fotos do laudo.
  - DELETE `/api/fotos/:id` → remove foto (banco + arquivo físico se existir).
- Autenticação
  - POST `/api/login` (público) → retorna token JWT.
- Inspetores (protegidos por JWT)
  - GET `/api/inspetores` → lista campos não sensíveis.
  - GET `/api/inspetores/:id`
  - POST `/api/inspetores` → cria; resposta omite `senha`.
  - PUT `/api/inspetores/:id`
  - DELETE `/api/inspetores/:id`

Serviço estático: GET `/uploads/...` para servir imagens diretamente do disco.

Tratamento de erros: respostas padronizadas com `400` (validação), `404` (não encontrado), `500` (erro interno). `TypeORM logging: true` habilitado para depuração.

## Persistência e infraestrutura

- TypeORM DataSource: configurável via `.env` (`DB_TYPE`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `PORT`).
- `synchronize: true` (dev): cria/atualiza schema automaticamente; recomendado migrar para migrations em produção.
- Docker Compose incluído:
  - `postgres:17` exposto em `5432`, volume persistente em `./data/postgres`.
  - `pgadmin4` em `http://localhost:8080` (volume em `./data/pgadmin`).
  - Observação Windows: preferir `DB_HOST=127.0.0.1` no `.env` quando usando Docker.

## Execução (resumo)

1) Criar `.env` conforme `README.md`.
2) Instalar dependências na pasta `api-crud-produtos/`.
3) Subir Postgres via Docker Compose (ou usar Postgres local) e garantir credenciais compatíveis com `.env`.
4) Rodar em desenvolvimento com `nodemon` (script `dev`) ou compilar com `tsc` e iniciar `node dist/app.js`.

Uploads são gravados em `uploads/laudos/:id` e expostos via `/uploads`.

## Observabilidade e monitoramento

- Endpoint de saúde: `/api/status`.
- Logs: console (startup informa endpoints), queries SQL (`logging: true`).
- Sem APM/SIEM integrados nesta versão.

## Segurança (estado atual)

- Autenticação JWT implementada. Endpoints públicos: `/api/status` e `/api/login`. Demais rotas exigem `Authorization: Bearer <token>`.
- Senhas de inspetores armazenadas como hash (bcrypt) e omitidas das respostas.
- Upload restrito a tipos de imagem e limites de tamanho/quantidade.
- Próximos (recomendado): RBAC por perfis, rate limiting, helmet, CORS por origem, validação com schema (Zod), rotacionar `JWT_SECRET` por ambiente.

## Limitações e riscos

- `synchronize: true` (dev) pode causar alterações de schema inesperadas; faltam migrations e seeds versionados.
- Armazenamento local de imagens; não resiliente em ambientes de múltiplas instâncias. Ideal mover para armazenamento de objetos (ex.: S3/Azure Blob) e servir via CDN.
- Ausência de paginação/filtros avançados nos endpoints de listagem.
- Sem testes automatizados (unidade/integrados) nesta versão.

## Qualidade — gates

- Build: PASS (TypeScript compila sem erros com `tsc`).
- Lint/Typecheck: PASS (sem erros reportados durante a compilação; não há linter configurado).
- Testes: N/A (sem suíte automatizada). Há roteiro de testes manuais em `TESTES_API.md`.

## Próximos passos (priorizados)

1) Autenticação e autorização
   - Login de inspetores, JWT, política de perfis, expiração e refresh.
2) Harden de produção
   - Desligar `logging` e `synchronize` em prod; adicionar migrations; rate limit; Helmet; CORS por origem.
3) Armazenamento de imagens
   - Compressão com `sharp`, thumbnails, metadados; mover para storage de objetos; URLs assinadas.
4) Busca e relatórios (ver `PLANO_FASE2.md`)
   - Endpoints de busca textual, filtros por período/status, relatórios agregados, histórico por placa.
5) Observabilidade
   - Logs estruturados (JSON), correlação de requisições, métricas (Prometheus/OpenTelemetry) e traços.
6) Qualidade
   - Testes unitários (validators, IPA), integração (rotas), e2e; CI com cobertura.
7) Performance e DX
   - Paginação; índices no banco (placa, vin, datas); DTOs e tipagem de payloads; validação com Zod/Yup.

## Referências do projeto

- Guia: `README.md`
- Testes manuais: `TESTES_API.md`
- Plano de evolução: `PLANO_FASE2.md`
- Principais fontes de código: `src/app.ts`, `src/entity/*`, `src/middleware/upload.ts`, `src/utils/validators.ts`

---

Resumo: Backend funcional com CRUD de laudos, cálculo de IPA e upload de fotos, persistência em PostgreSQL e documentação de execução. Para produção, priorizar segurança, migrations, storage de imagens gerenciados e testes automatizados.
