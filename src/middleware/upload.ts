import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configuração do Multer para upload de fotos
// Armazena no disco em uploads/laudos/:id com nomes únicos por timestamp
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const laudoId = req.params.id;
        const uploadPath = path.join('uploads', 'laudos', laudoId);
        
        // Criar diretório se não existir
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}_${timestamp}${ext}`);
    }
});

// Filtro para validar tipos de arquivo aceitos
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de arquivo não permitido. Use apenas: JPG, PNG, WEBP'));
    }
};

// Configuração do Multer
export const uploadFotos = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB por arquivo
    files: 10 // Máximo 10 arquivos por upload
  }
});

// Middleware para compressão de imagem (opcional - pode ser implementado depois)
export const compressImage = (req: any, res: any, next: any) => {
    // TODO: Implementar compressão com sharp ou similar
    next();
};