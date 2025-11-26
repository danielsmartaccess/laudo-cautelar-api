// Inicializa metadados de reflexão exigidos pelo TypeORM (decorators)
import "reflect-metadata"
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { myDataSource } from "./data-source";
import { Laudo } from "./entity/Laudo";
import { FotoLaudo } from "./entity/FotoLaudo";
import { Inspetor } from "./entity/Inspetor";
import { uploadFotos } from "./middleware/upload";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { InspetorService } from './services/InspetorService';
import { LaudoService } from './services/LaudoService';
import { FotoLaudoService } from './services/FotoLaudoService';
// -----------------------------------------------------------------------------
// Função para calcular IPA Score (mesma lógica do frontend)
// Entrada: objeto "data" com os campos do laudo.
// Saída: { score: number (0-100), notes: string[], badge: string }
// Observação: Essa função espelha a regra de negócio do frontend para garantir
// consistência no cálculo, independentemente de onde o dado foi gerado.
// -----------------------------------------------------------------------------
// Regras de cálculo de IPA migradas para LaudoService

// ----------------------------------------------------------------------------
// Boot da aplicação: inicializa a conexão com o banco e sobe o servidor Express
// ----------------------------------------------------------------------------
myDataSource.initialize().then(async () => {
    const app = express();
    const port = Number(process.env.PORT || 3000);
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
    // Middlewares
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    // Servir arquivos estáticos para fotos
    app.use('/uploads', express.static('uploads'));
    // Middleware de autenticação (JWT) - simples
    function auth(req: Request, res: Response, next: Function) {
        // Endpoints públicos: status, login, uploads estáticos
        if (req.path.startsWith('/api/status') || req.path.startsWith('/api/login') || req.path.startsWith('/uploads')) {
            return next();
        }
        const header = req.headers['authorization'];
        if (!header || !header.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token ausente' });
        }
        const token = header.substring(7);
        try {
            const payload = jwt.verify(token, jwtSecret) as any;
            (req as any).user = payload;
            next();
        } catch (e) {
            return res.status(401).json({ error: 'Token inválido' });
        }
    }

    // Repositórios e Serviços
    const inspetorRepo = myDataSource.getRepository(Inspetor);
    const laudoRepo = myDataSource.getRepository(Laudo);
    const fotoRepo = myDataSource.getRepository(FotoLaudo);
    const inspetorService = new InspetorService(inspetorRepo);
    const laudoService = new LaudoService(laudoRepo, fotoRepo);
    const fotoService = new FotoLaudoService(laudoRepo, fotoRepo);

    // Seed: cria usuário admin padrão se vazio (apenas DEV)
    try {
        const count = await inspetorRepo.count();
        if (count === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            const admin = inspetorRepo.create({
                email: 'admin@example.com',
                nome: 'Administrador',
                senha: hash,
                ativo: true,
            });
            await inspetorRepo.save(admin);
            console.log('👤 Usuário admin criado: admin@example.com / admin123');
        }
    } catch (e) {
        console.warn('Não foi possível verificar/criar admin padrão:', e);
    }

    // ROTA DE LOGIN (pública)
    app.post('/api/login', async (req: Request, res: Response) => {
        try {
            const { email, senha } = req.body;
            const user = await inspetorRepo.findOne({ where: { email } });
            if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
            const ok = await bcrypt.compare(String(senha || ''), user.senha);
            if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });
            const token = jwt.sign({ sub: user.id, email: user.email, nome: user.nome }, jwtSecret, { expiresIn: '8h' });
            res.json({ token, user: { id: user.id, nome: user.nome, email: user.email } });
        } catch (e) {
            res.status(500).json({ error: 'Erro no login' });
        }
    });

    // A partir daqui, exigir auth
    app.use(auth);

    // ROTAS DE LAUDOS ----------------------------------------------------------------
    // Listar todos os laudos
    app.get("/api/laudos", async function (req: Request, res: Response) {
        try {
            res.json(await laudoService.listAll());
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar laudos' });
        }
    });
    // Buscar laudo por ID
    app.get("/api/laudos/:id", async function (req: Request, res: Response) {
        try {
            const laudo = await laudoService.getById(parseInt(req.params.id));
            res.json(laudo);
        } catch (error) {
            res.status(404).json({ error: 'Laudo não encontrado' });
        }
    });
    // Buscar laudos por placa
    app.get("/api/laudos/placa/:placa", async function (req: Request, res: Response) {
        try {
            res.json(await laudoService.getByPlaca(req.params.placa));
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar laudos por placa' });
        }
    });
    // Criar novo laudo
    app.post("/api/laudos", async function (req: Request, res: Response) {
        try {
            const criado = await laudoService.create(req.body);
            res.status(201).json(criado);
        } catch (error: any) {
            const status = Number((error as any).status) || 500;
            const payload: any = { error: error?.message || 'Erro ao criar laudo' };
            if ((error as any).details) payload.erros = (error as any).details;
            res.status(status).json(payload);
        }
    });
    // Atualizar laudo
    app.put("/api/laudos/:id", async function (req: Request, res: Response) {
        try {
            const atualizado = await laudoService.update(parseInt(req.params.id), req.body);
            res.json(atualizado);
        } catch (error: any) {
            const status = Number((error as any).status) || (String(error?.message).includes('não encontrado') ? 404 : 500);
            res.status(status).json({ error: error?.message || 'Erro ao atualizar laudo' });
        }
    });
    // Deletar laudo
    app.delete("/api/laudos/:id", async function (req: Request, res: Response) {
        try {
            await laudoService.remove(parseInt(req.params.id));
            res.json({ message: "Laudo deletado com sucesso!" });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao deletar laudo' });
        }
    });

    // ROTAS DE FOTOS DOS LAUDOS -------------------------------------------------------

    // Upload de fotos para um laudo
    app.post("/api/laudos/:id/fotos", uploadFotos.array('fotos', 10), async function (req: Request, res: Response) {
        try {
            const laudoId = parseInt(req.params.id);
            const files = req.files as Express.Multer.File[];
            const fotos = await fotoService.adicionarFotos(laudoId, files);
            res.json({ message: `${fotos.length} foto(s) enviada(s) com sucesso`, fotos });
        } catch (error: any) {
            const status = Number((error as any).status) || 500;
            res.status(status).json({ error: error?.message || 'Erro ao fazer upload das fotos' });
        }
    });

    // Listar fotos de um laudo
    app.get("/api/laudos/:id/fotos", async function (req: Request, res: Response) {
        try {
            const laudoId = parseInt(req.params.id);
            res.json(await fotoService.listarPorLaudo(laudoId));
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar fotos' });
        }
    });

    // Deletar uma foto específica
    app.delete("/api/fotos/:id", async function (req: Request, res: Response) {
        try {
            const fotoId = parseInt(req.params.id);
            await fotoService.removerFoto(fotoId);
            res.json({ message: "Foto deletada com sucesso!" });
        } catch (error: any) {
            const status = Number((error as any).status) || 500;
            res.status(status).json({ error: error?.message || 'Erro ao deletar foto' });
        }
    });

    // ROTAS DE INSPETORES -------------------------------------------------------------

    // CRUD completo de inspetores (protegido)
    app.get("/api/inspetores", async (req: Request, res: Response) => {
        try {
            res.json(await inspetorService.listar());
        } catch (error) { res.status(500).json({ error: 'Erro ao buscar inspetores' }); }
    });
    app.get("/api/inspetores/:id", async (req: Request, res: Response) => {
        try {
            const ent = await inspetorService.obter(parseInt(req.params.id));
            const { senha, ...outro } = ent as any; res.json(outro);
        } catch (error: any) { res.status(404).json({ error: error.message || 'Inspetor não encontrado' }); }
    });
    app.post("/api/inspetores", async (req: Request, res: Response) => {
        try {
            const criado = await inspetorService.criar(req.body);
            const { senha, ...outro } = criado as any; res.status(201).json(outro);
        } catch (error: any) {
            const msg = String(error?.message || 'Erro ao criar inspetor');
            const status = msg.includes('Email já cadastrado') || msg.includes('Dados obrigatórios') ? 400 : 500;
            res.status(status).json({ error: msg });
        }
    });
    app.put("/api/inspetores/:id", async (req: Request, res: Response) => {
        try {
            const atualizado = await inspetorService.atualizar(parseInt(req.params.id), req.body);
            const { senha, ...outro } = atualizado as any; res.json(outro);
        } catch (error: any) {
            const status = String(error?.message).includes('não encontrado') ? 404 : 500;
            res.status(status).json({ error: error.message || 'Erro ao atualizar inspetor' });
        }
    });
    app.delete("/api/inspetores/:id", async (req: Request, res: Response) => {
        try { await inspetorService.remover(parseInt(req.params.id)); res.json({ message: 'Inspetor removido' }); }
        catch (error: any) { const status = String(error?.message).includes('não encontrado') ? 404 : 500; res.status(status).json({ error: error.message || 'Erro ao remover inspetor' }); }
    });
    // ROTA DE STATUS
    app.get("/api/status", (req: Request, res: Response) => {
        res.json({ 
            status: "ok", 
            timestamp: new Date().toISOString(),
            version: "1.0.0",
            description: "API Laudo Cautelar Automotivo"
        });
    });
    app.listen(port, () => {
        console.log(`🚗 API Laudo Cautelar rodando em http://localhost:${port}`);
        console.log(`🗄️  DB conectado:`, {
            type: (myDataSource.options as any).type,
            host: (myDataSource.options as any).host,
            database: (myDataSource.options as any).database
        });
        console.log(`📊 Endpoints disponíveis:`);
        console.log(`   GET    /api/status`);
    console.log(`   POST   /api/login (public)`);
    console.log(`   GET    /api/laudos`);
        console.log(`   POST   /api/laudos`);
        console.log(`   GET    /api/laudos/:id`);
        console.log(`   PUT    /api/laudos/:id`);
        console.log(`   DELETE /api/laudos/:id`);
        console.log(`   GET    /api/laudos/placa/:placa`);
        console.log(`   POST   /api/laudos/:id/fotos`);
        console.log(`   GET    /api/laudos/:id/fotos`);
        console.log(`   DELETE /api/fotos/:id`);
    console.log(`   GET    /api/inspetores`);
    console.log(`   GET    /api/inspetores/:id`);
    console.log(`   POST   /api/inspetores`);
    console.log(`   PUT    /api/inspetores/:id`);
    console.log(`   DELETE /api/inspetores/:id`);
    });
}).catch((error) => console.log("❌ Erro ao inicializar:", error));
