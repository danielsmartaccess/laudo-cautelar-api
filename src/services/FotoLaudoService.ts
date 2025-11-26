import { Repository } from "typeorm";
import { Laudo } from "../entity/Laudo";
import { FotoLaudo } from "../entity/FotoLaudo";
import fs from 'fs';

export class FotoLaudoService {
  constructor(private laudoRepo: Repository<Laudo>, private fotoRepo: Repository<FotoLaudo>) {}

  async adicionarFotos(laudoId: number, files: Express.Multer.File[]) {
    const laudo = await this.laudoRepo.findOneBy({ id: laudoId });
    if (!laudo) {
      const err = new Error('Laudo não encontrado');
      (err as any).status = 404;
      throw err;
    }
    if (!files || files.length === 0) {
      const err = new Error('Nenhuma foto foi enviada');
      (err as any).status = 400;
      throw err;
    }
    const salvas: FotoLaudo[] = [];
    for (const file of files) {
      const ent = this.fotoRepo.create({
        nomeArquivo: file.filename,
        caminhoArquivo: file.path,
        tamanhoArquivo: file.size,
        tipoMime: file.mimetype,
        laudo
      });
      salvas.push(await this.fotoRepo.save(ent));
    }
    return salvas;
  }

  listarPorLaudo(laudoId: number) {
    return this.fotoRepo.find({ where: { laudo: { id: laudoId } }, order: { criadoEm: 'DESC' } });
  }

  async removerFoto(fotoId: number) {
    const foto = await this.fotoRepo.findOne({ where: { id: fotoId } });
    if (!foto) {
      const err = new Error('Foto não encontrada');
      (err as any).status = 404;
      throw err;
    }
    if (foto.caminhoArquivo && fs.existsSync(foto.caminhoArquivo)) {
      try { fs.unlinkSync(foto.caminhoArquivo); } catch {}
    }
    await this.fotoRepo.delete(fotoId);
    return true;
  }
}
