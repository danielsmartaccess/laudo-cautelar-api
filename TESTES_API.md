# 🧪 TESTES DA API - Sistema Laudo Cautelar

## Fluxo recomendado (Insomnia/Postman)

1) Status (público)
```bash
curl http://localhost:3000/api/status
```

2) Login (obter token JWT)
```bash
curl -X POST http://localhost:3000/api/login \
 -H "Content-Type: application/json" \
 -d '{
  "email": "admin@example.com",
  "senha": "admin123"
 }'
```

3) Criar Laudo (usar Bearer <TOKEN>)
```bash
curl -X POST http://localhost:3000/api/laudos \
 -H "Content-Type: application/json" \
 -H "Authorization: Bearer <TOKEN>" \
 -d '{
  "placa": "ABC1234",
  "vin": "9BGRD08X04G117974",
  "motor": "CHZ123456",
  "anoModelo": "2020/2021",
  "inspetor": "João Silva",
  "longarinas": "Íntegra",
  "colunas": "Íntegra",
  "cortafogo": "Original",
  "colisaoGrave": "Não",
  "pinturaEsp": 120,
  "tonalidade": "Não",
  "vidrosOrig": "Sim",
  "faroisOrig": "Sim",
  "oxidacao": "Não",
  "carpetes": "Íntegros",
  "odor": "Não",
  "eletricoGeral": "Ok",
  "falhasObd": "Não",
  "kmObd": 45000,
  "consistenciaKm": "Sim",
  "airbags": "Ativos",
  "vazamentos": "Não",
  "pneus": "Uniforme",
  "suspensao": "Ok",
  "direcao": "Normal",
  "freios": "Normal",
  "sistemaEletrico": "Ok",
  "statusVeiculo": "Sem restrições relevantes"
 }'
```

4) Listar Laudos
```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/laudos
```

5) Buscar Laudo por ID
```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/laudos/1
```

6) Buscar por Placa
```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/laudos/placa/ABC1234
```

7) Upload de Fotos (use Insomnia/Postman)

- Método: POST `http://localhost:3000/api/laudos/1/fotos`
- Headers: `Authorization: Bearer <TOKEN>`
- Body: `multipart/form-data` com key `fotos` (múltiplos arquivos)

8) Listar Fotos do Laudo
```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/laudos/1/fotos
```

## Dados de teste

Laudo Válido (Score Alto - Verde)
- Placa: ABC1234
- VIN: 9BGRD08X04G117974
- Tudo "OK" = Score próximo a 100

Laudo com Problemas (Score Baixo - Vermelho)
```json
{
  "placa": "XYZ5678",
  "vin": "1HGBH41JXMN109186",
  "inspetor": "Maria Santos",
  "longarinas": "Reparada",
  "colunas": "Com indícios",
  "colisaoGrave": "Sim",
  "oxidacao": "Grave",
  "carpetes": "Sinais de água",
  "falhasObd": "Sim",
  "consistenciaKm": "Não"
}
```

## Validações implementadas

- ✅ Placa: formato brasileiro (ABC1234 ou ABC1D23)
- ✅ VIN: 17 caracteres alfanuméricos
- ✅ Campos obrigatórios: placa, vin, inspetor
- ✅ Valores numéricos: pinturaEsp (0-500), kmObd (0-9999999)
- ✅ Upload: apenas JPG, PNG, WEBP (máx 10MB, 10 arquivos)