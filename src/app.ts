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
import { LaudoValidator } from "./utils/validators";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { InspetorService } from './services/InspetorService';
// -----------------------------------------------------------------------------
// Função para calcular IPA Score (mesma lógica do frontend)
// Entrada: objeto "data" com os campos do laudo.
// Saída: { score: number (0-100), notes: string[], badge: string }
// Observação: Essa função espelha a regra de negócio do frontend para garantir
// consistência no cálculo, independentemente de onde o dado foi gerado.
// -----------------------------------------------------------------------------
function calcIPA(data: any) {
    let score = 100;
    const notes: string[] = [];
    if (data.longarinas !== 'Íntegra') { score -= 25; notes.push('Longarinas com reparos/indícios'); }
    if (data.colunas !== 'Íntegra') { score -= 20; notes.push('Colunas com reparos/indícios'); }
    if (data.cortafogo !== 'Original') { score -= 10; notes.push('Painel corta-fogo alterado'); }
    if (data.colisaoGrave === 'Sim') { score -= 35; notes.push('Sinais de colisão grave'); }
    if (data.tonalidade === 'Sim') { score -= 5; notes.push('Diferença de tonalidade'); }
    if (data.vidrosOrig === 'Não') { score -= 3; notes.push('Vidros não originais'); }
    if (data.faroisOrig === 'Não') { score -= 3; notes.push('Faróis não originais'); }
    if (data.pinturaEsp && (data.pinturaEsp > 180 || data.pinturaEsp < 70)) { 
        score -= 5; notes.push('Espessura de pintura fora do padrão'); 
    }
    if (data.oxidacao === 'Leve') score -= 5;
    if (data.oxidacao === 'Moderada') score -= 12;
    if (data.oxidacao === 'Grave') { score -= 25; notes.push('Oxidação significativa (enchente?)'); }
    if (data.carpetes === 'Sinais de água') { score -= 15; notes.push('Carpetes/forros com sinais de água'); }
    if (data.odor === 'Sim') { score -= 8; notes.push('Odor de umidade'); }
    if (data.eletricoGeral === 'Irregular') { score -= 10; notes.push('Sistema elétrico irregular'); }
    if (data.falhasObd === 'Sim') { score -= 10; notes.push('Falhas registradas no OBD'); }
    if (data.consistenciaKm === 'Não') { score -= 20; notes.push('Inconsistência de quilometragem'); }
    if (data.airbags === 'Falha detectada') { score -= 12; notes.push('Falha de airbags'); }
    if (data.vazamentos === 'Sim') { score -= 8; notes.push('Vazamentos visíveis'); }
    if (data.pneus === 'Desgaste irregular') { score -= 5; notes.push('Pneus com desgaste irregular'); }
    if (data.suspensao === 'Irregularidades') { score -= 6; notes.push('Irregularidades na suspensão'); }
    if (data.direcao === 'Anomalia') { score -= 7; notes.push('Anomalia na direção'); }
    if (data.freios === 'Anomalia') { score -= 8; notes.push('Anomalia nos freios'); }
    if (data.sistemaEletrico === 'Falha') { score -= 5; notes.push('Falha no sistema elétrico'); }
    if (data.historicoRisco && data.historicoRisco !== 'Não') { 
        score -= 10; notes.push(`Histórico: ${data.historicoRisco}`); 
    }
    if (data.crlvOk === 'Não') { score -= 5; notes.push('CRLV/CRV não conferido'); }
    score = Math.max(0, Math.min(100, score));
    let badge = 'Aguardando dados';
    if (score >= 85) badge = 'Verde – Excelente';
    else if (score >= 70) badge = 'Amarelo – Bom';
    else if (score >= 50) badge = 'Laranja – Atenção';
    else badge = 'Vermelho – Risco';
    return { score, notes, badge };
}

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

    // Serviço de Inspetor
    const inspetorRepo = myDataSource.getRepository(Inspetor);
    const inspetorService = new InspetorService(inspetorRepo);

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
            const laudos = await myDataSource.getRepository(Laudo).find({
                relations: ['fotos'],
                order: { criadoEm: 'DESC' }
            });
            res.json(laudos);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar laudos' });
        }
    });
    // Buscar laudo por ID
    app.get("/api/laudos/:id", async function (req: Request, res: Response) {
        try {
            const laudo = await myDataSource.getRepository(Laudo).findOne({
                where: { id: parseInt(req.params.id) },
                relations: ['fotos']
            });
            if (!laudo) {
                return res.status(404).json({ error: "Laudo não encontrado!" });
            }
            res.json(laudo);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar laudo' });
        }
    });
    // Buscar laudos por placa
    app.get("/api/laudos/placa/:placa", async function (req: Request, res: Response) {
        try {
            const laudos = await myDataSource.getRepository(Laudo).find({
                where: { placa: req.params.placa.toUpperCase() },
                relations: ['fotos'],
                order: { criadoEm: 'DESC' }
            });
            res.json(laudos);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar laudos por placa' });
        }
    });
    // Criar novo laudo
    app.post("/api/laudos", async function (req: Request, res: Response) {
        try {
            // Validar dados de entrada
            const validacao = LaudoValidator.validarLaudo(req.body);
            
            if (!validacao.valido) {
                return res.status(400).json({
                    error: 'Dados inválidos',
                    erros: validacao.erros
                });
            }
            
            const laudoData = validacao.dados;
            
            // Calcular IPA Score
            const { score, notes, badge } = calcIPA(laudoData);
            
            // Criar laudo com score calculado
            const laudo = myDataSource.getRepository(Laudo).create({
                ...laudoData,
                ipaScore: score,
                ipaBadge: badge,
                ipaNotas: notes
            });
            
            const resultado = await myDataSource.getRepository(Laudo).save(laudo);
            res.json(resultado);
        } catch (error) {
            console.error('Erro ao criar laudo:', error);
            res.status(500).json({ error: 'Erro ao criar laudo' });
        }
    });
    // Atualizar laudo
    app.put("/api/laudos/:id", async function (req: Request, res: Response) {
        try {
            const laudo = await myDataSource.getRepository(Laudo).findOneBy({
                id: parseInt(req.params.id),
            });
            if (!laudo) {
                return res.status(404).json({ error: "Laudo não encontrado!" });
            }
            const laudoData = req.body;
            // Recalcular IPA Score
            const { score, notes, badge } = calcIPA(laudoData);
            // Atualizar dados
            myDataSource.getRepository(Laudo).merge(laudo, {
                ...laudoData,
                placa: laudoData.placa?.toUpperCase(),
                ipaScore: score,
                ipaBadge: badge,
                ipaNotas: notes
            });
            const resultado = await myDataSource.getRepository(Laudo).save(laudo);
            res.json(resultado);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao atualizar laudo' });
        }
    });
    // Deletar laudo
    app.delete("/api/laudos/:id", async function (req: Request, res: Response) {
        try {
            const resultado = await myDataSource.getRepository(Laudo).delete(req.params.id);
            if (resultado.affected === 0) {
                return res.status(404).json({ error: "Laudo não encontrado!" });
            }
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
            
            // Verificar se o laudo existe
            const laudo = await myDataSource.getRepository(Laudo).findOneBy({ id: laudoId });
            if (!laudo) {
                return res.status(404).json({ error: "Laudo não encontrado!" });
            }
            
            const files = req.files as Express.Multer.File[];
            
            if (!files || files.length === 0) {
                return res.status(400).json({ error: "Nenhuma foto foi enviada" });
            }
            
            const fotosRepository = myDataSource.getRepository(FotoLaudo);
            const fotosSalvas = [];
            
            for (const file of files) {
                const foto = fotosRepository.create({
                    nomeArquivo: file.filename,
                    caminhoArquivo: file.path,
                    tamanhoArquivo: file.size,
                    tipoMime: file.mimetype,
                    laudo: laudo
                });
                
                const fotoSalva = await fotosRepository.save(foto);
                fotosSalvas.push(fotoSalva);
            }
            
            res.json({
                message: `${fotosSalvas.length} foto(s) enviada(s) com sucesso`,
                fotos: fotosSalvas
            });
            
        } catch (error) {
            console.error('Erro ao fazer upload das fotos:', error);
            res.status(500).json({ error: 'Erro ao fazer upload das fotos' });
        }
    });

    // Listar fotos de um laudo
    app.get("/api/laudos/:id/fotos", async function (req: Request, res: Response) {
        try {
            const laudoId = parseInt(req.params.id);
            
            const fotos = await myDataSource.getRepository(FotoLaudo).find({
                where: { laudo: { id: laudoId } },
                order: { criadoEm: 'DESC' }
            });
            
            res.json(fotos);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar fotos' });
        }
    });

    // Deletar uma foto específica
    app.delete("/api/fotos/:id", async function (req: Request, res: Response) {
        try {
            const fotoId = parseInt(req.params.id);
            
            const foto = await myDataSource.getRepository(FotoLaudo).findOneBy({ id: fotoId });
            
            if (!foto) {
                return res.status(404).json({ error: "Foto não encontrada!" });
            }
            
            // Deletar arquivo físico
            const fs = require('fs');
            if (fs.existsSync(foto.caminhoArquivo)) {
                fs.unlinkSync(foto.caminhoArquivo);
            }
            
            // Deletar do banco
            await myDataSource.getRepository(FotoLaudo).delete(fotoId);
            
            res.json({ message: "Foto deletada com sucesso!" });
        } catch (error) {
            res.status(500).json({ error: 'Erro ao deletar foto' });
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
