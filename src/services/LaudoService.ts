import { Repository } from "typeorm";
import { Laudo } from "../entity/Laudo";
import { FotoLaudo } from "../entity/FotoLaudo";
import { LaudoValidator } from "../utils/validators";

export class LaudoService {
  constructor(private laudoRepo: Repository<Laudo>, private fotoRepo: Repository<FotoLaudo>) {}

  async listAll() {
    return this.laudoRepo.find({ relations: ["fotos"], order: { criadoEm: "DESC" } });
  }

  async getById(id: number) {
    const laudo = await this.laudoRepo.findOne({ where: { id }, relations: ["fotos"] });
    if (!laudo) throw new Error("Laudo não encontrado");
    return laudo;
  }

  async getByPlaca(placa: string) {
    const normalized = (placa || "").toUpperCase();
    return this.laudoRepo.find({ where: { placa: normalized }, relations: ["fotos"], order: { criadoEm: "DESC" } });
  }

  async create(data: any) {
    const validacao = LaudoValidator.validarLaudo(data);
    if (!validacao.valido) {
      const err = new Error("Dados inválidos");
      (err as any).status = 400;
      (err as any).details = validacao.erros;
      throw err;
    }
    const laudoData = validacao.dados;
    const { score, notes, badge } = this.calcIPA(laudoData);
    const laudo = this.laudoRepo.create({ ...laudoData, placa: laudoData.placa?.toUpperCase(), ipaScore: score, ipaBadge: badge, ipaNotas: notes });
    return this.laudoRepo.save(laudo);
  }

  async update(id: number, data: any) {
    const laudo = await this.laudoRepo.findOneBy({ id });
    if (!laudo) throw new Error("Laudo não encontrado");
    const validacao = LaudoValidator.validarLaudo({ ...laudo, ...data });
    if (!validacao.valido) {
      const err = new Error("Dados inválidos");
      (err as any).status = 400;
      (err as any).details = validacao.erros;
      throw err;
    }
    const laudoData = validacao.dados;
    const { score, notes, badge } = this.calcIPA(laudoData);
    this.laudoRepo.merge(laudo, { ...laudoData, placa: laudoData.placa?.toUpperCase(), ipaScore: score, ipaBadge: badge, ipaNotas: notes });
    return this.laudoRepo.save(laudo);
  }

  async remove(id: number) {
    const r = await this.laudoRepo.delete(id);
    if (!r.affected) throw new Error("Laudo não encontrado");
    return true;
  }

  // Mesma regra usada no app; duplicada aqui para não alterar muito a estrutura
  private calcIPA(data: any) {
    let score = 100;
    const notes: string[] = [];
    if (data.longarinas !== 'Íntegra') { score -= 25; notes.push('Longarinas com reparos/indícios'); }
    if (data.colunas !== 'Íntegra') { score -= 20; notes.push('Colunas com reparos/indícios'); }
    if (data.cortafogo !== 'Original') { score -= 10; notes.push('Painel corta-fogo alterado'); }
    if (data.colisaoGrave === 'Sim') { score -= 35; notes.push('Sinais de colisão grave'); }
    if (data.tonalidade === 'Sim') { score -= 5; notes.push('Diferença de tonalidade'); }
    if (data.vidrosOrig === 'Não') { score -= 3; notes.push('Vidros não originais'); }
    if (data.faroisOrig === 'Não') { score -= 3; notes.push('Faróis não originais'); }
    if (data.pinturaEsp && (data.pinturaEsp > 180 || data.pinturaEsp < 70)) { score -= 5; notes.push('Espessura de pintura fora do padrão'); }
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
    if (data.historicoRisco && data.historicoRisco !== 'Não') { score -= 10; notes.push(`Histórico: ${data.historicoRisco}`); }
    if (data.crlvOk === 'Não') { score -= 5; notes.push('CRLV/CRV não conferido'); }
    score = Math.max(0, Math.min(100, score));
    let badge = 'Aguardando dados';
    if (score >= 85) badge = 'Verde – Excelente';
    else if (score >= 70) badge = 'Amarelo – Bom';
    else if (score >= 50) badge = 'Laranja – Atenção';
    else badge = 'Vermelho – Risco';
    return { score, notes, badge };
  }
}
