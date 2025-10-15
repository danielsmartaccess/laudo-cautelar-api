// Validações para dados do laudo cautelar
// Fluxo: sanitizar -> validar obrigatórios -> validar numéricos -> combinar erros

export class LaudoValidator {
    
    // Validar formato de placa brasileira
    static validarPlaca(placa: string): boolean {
        if (!placa) return false;
        
        // Formato antigo: ABC1234 ou ABC-1234
        const formatoAntigo = /^[A-Z]{3}[-]?\d{4}$/;
        
        // Formato Mercosul: ABC1D23 ou ABC-1D23
        const formatoMercosul = /^[A-Z]{3}[-]?\d{1}[A-Z]{1}\d{2}$/;
        
        const placaLimpa = placa.replace(/[-\s]/g, '').toUpperCase();
        
        return formatoAntigo.test(placaLimpa) || formatoMercosul.test(placaLimpa);
    }
    
    // Validar chassi/VIN (17 caracteres)
    static validarVin(vin: string): boolean {
        if (!vin) return false;
        
        const vinLimpo = vin.replace(/[\s-]/g, '').toUpperCase();
        
        // VIN deve ter exatamente 17 caracteres alfanuméricos
        // Não pode conter I, O, Q
        const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
        
        return vinRegex.test(vinLimpo);
    }
    
    // Validar dados obrigatórios
    static validarDadosObrigatorios(data: any): string[] {
        const erros: string[] = [];
        
        if (!data.placa) {
            erros.push('Placa é obrigatória');
        } else if (!this.validarPlaca(data.placa)) {
            erros.push('Formato da placa inválido');
        }
        
        if (!data.vin) {
            erros.push('Chassi/VIN é obrigatório');
        } else if (!this.validarVin(data.vin)) {
            erros.push('Formato do chassi/VIN inválido');
        }
        
        if (!data.inspetor || data.inspetor.trim() === '') {
            erros.push('Nome do inspetor é obrigatório');
        }
        
        return erros;
    }
    
    // Validar valores numéricos
    static validarValoresNumericos(data: any): string[] {
        const erros: string[] = [];
        
        if (data.pinturaEsp !== undefined && data.pinturaEsp !== null) {
            const espessura = Number(data.pinturaEsp);
            if (isNaN(espessura) || espessura < 0 || espessura > 500) {
                erros.push('Espessura de pintura deve estar entre 0 e 500 μm');
            }
        }
        
        if (data.kmObd !== undefined && data.kmObd !== null) {
            const km = Number(data.kmObd);
            if (isNaN(km) || km < 0 || km > 9999999) {
                erros.push('Quilometragem OBD inválida');
            }
        }
        
        return erros;
    }
    
    // Sanitizar dados de entrada
    static sanitizarDados(data: any): any {
        const dadosLimpos = { ...data };
        
        // Limpar e formatar placa
        if (dadosLimpos.placa) {
            dadosLimpos.placa = dadosLimpos.placa
                .replace(/[^A-Z0-9]/g, '')
                .toUpperCase();
        }
        
        // Limpar e formatar VIN
        if (dadosLimpos.vin) {
            dadosLimpos.vin = dadosLimpos.vin
                .replace(/[\s-]/g, '')
                .toUpperCase();
        }
        
        // Trimmar strings
        Object.keys(dadosLimpos).forEach(key => {
            if (typeof dadosLimpos[key] === 'string') {
                dadosLimpos[key] = dadosLimpos[key].trim();
            }
        });
        
        // Converter números
        if (dadosLimpos.pinturaEsp) {
            dadosLimpos.pinturaEsp = Number(dadosLimpos.pinturaEsp);
        }
        if (dadosLimpos.kmObd) {
            dadosLimpos.kmObd = Number(dadosLimpos.kmObd);
        }
        
        return dadosLimpos;
    }
    
    // Validação completa: agrega sanitização e validações em um único retorno
    static validarLaudo(data: any): { valido: boolean; erros: string[]; dados: any } {
        const dadosLimpos = this.sanitizarDados(data);
        
        const errosObrigatorios = this.validarDadosObrigatorios(dadosLimpos);
        const errosNumericos = this.validarValoresNumericos(dadosLimpos);
        
        const todosErros = [...errosObrigatorios, ...errosNumericos];
        
        return {
            valido: todosErros.length === 0,
            erros: todosErros,
            dados: dadosLimpos
        };
    }
}