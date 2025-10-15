import { Repository } from "typeorm";
import { Inspetor } from "../entity/Inspetor";
import bcrypt from "bcryptjs";

export class InspetorService {
  constructor(private repo: Repository<Inspetor>) {}

  async criar(data: Partial<Inspetor>) {
    if (!data.email || !data.nome || !data.senha) {
      throw new Error("Dados obrigatórios ausentes (email, nome, senha)");
    }
    const existente = await this.repo.findOne({ where: { email: data.email } });
    if (existente) throw new Error("Email já cadastrado");
    const hash = await bcrypt.hash(String(data.senha), 10);
    const insp = this.repo.create({ ...data, senha: hash, ativo: true });
    return this.repo.save(insp);
  }

  listar() {
    return this.repo.find({ select: ["id", "nome", "email", "telefone", "registro", "ativo", "criadoEm"] });
  }

  async obter(id: number) {
    const insp = await this.repo.findOne({ where: { id } });
    if (!insp) throw new Error("Inspetor não encontrado");
    return insp;
  }

  async atualizar(id: number, data: Partial<Inspetor>) {
    const insp = await this.obter(id);
    if (data.senha) {
      data.senha = await bcrypt.hash(String(data.senha), 10);
    }
    this.repo.merge(insp, data);
    return this.repo.save(insp);
  }

  async remover(id: number) {
    const r = await this.repo.delete(id);
    if (!r.affected) throw new Error("Inspetor não encontrado");
    return true;
  }
}
