import { DataSource } from "typeorm";
import path from "path";
import dotenv from "dotenv";

// Carrega variáveis do .env localizado na raiz do pacote (api-crud-produtos/.env)
// Dica: Em Windows, quando usar Docker para Postgres, prefira DB_HOST=127.0.0.1 para evitar
// problemas de resolução de nome com "localhost".
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const dbType = (process.env.DB_TYPE || "postgres") as any;

// Logs de diagnóstico para verificar variáveis de ambiente carregadas
const debugDbConfig = {
    type: dbType,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    database: process.env.DB_NAME,
    passwordDefined: Boolean(process.env.DB_PASSWORD),
    passwordLength: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0,
};
// Evita logar a senha em texto puro
console.log("[DB CONFIG]", debugDbConfig);

// DataSource do TypeORM: centraliza as credenciais e entidades do projeto
export const myDataSource = new DataSource({
    type: dbType,
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "laudo_cautelar",
    // Carrega todas as entidades TypeORM da pasta entity (compilação TS em tempo de dev)
    entities: ["src/entity/*.ts"],
    // Ative logs de queries para depuração em dev (desative em produção)
    logging: true,
    // synchronize: true cria/atualiza o schema automaticamente (apenas dev)
    synchronize: true,
})