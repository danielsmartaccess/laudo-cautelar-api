# 🚗 PLANO DETALHADO - FASE 2: MELHORIAS ESSENCIAIS

## **2.1 SISTEMA DE UPLOAD DE FOTOS**
### Implementar:
- Middleware Multer para upload
- Compressão automática de imagens
- Validação de tipos de arquivo
- Pasta organizada por data/laudo
- URL pública para acessar fotos

### Endpoints a criar:
- POST /api/laudos/:id/fotos - Upload múltiplo
- GET /api/laudos/:id/fotos - Listar fotos do laudo
- DELETE /api/fotos/:id - Remover foto específica

## **2.2 VALIDAÇÕES E REGRAS DE NEGÓCIO**
### Implementar:
- Validação de placa (formato brasileiro)
- Validação de chassi/VIN (17 dígitos)
- Campos obrigatórios por seção
- Validação de valores numéricos
- Sanitização de dados de entrada

## **2.3 BUSCA E FILTROS AVANÇADOS**
### Endpoints a criar:
- GET /api/laudos/search?q={termo} - Busca textual
- GET /api/laudos/filter?status={status}&periodo={periodo} - Filtros
- GET /api/laudos/relatorios/periodo - Relatórios por período
- GET /api/veiculos/{placa}/historico - Histórico completo do veículo

## **2.4 AUDITORIA E LOGS**
### Implementar:
- Log de todas as operações CRUD
- Timestamp de criação/modificação
- Rastro de quem fez alterações
- Backup automático do banco
