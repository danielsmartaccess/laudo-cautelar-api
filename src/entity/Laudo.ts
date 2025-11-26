import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { FotoLaudo } from "./FotoLaudo";

@Entity()
export class Laudo {
    @PrimaryGeneratedColumn()
    id!: number;

    // Identificação do Veículo --------------------------------------------------------
    @Column()
    placa!: string;

    @Column()
    vin!: string; // chassi

    @Column({ nullable: true })
    motor?: string;

    @Column({ nullable: true })
    anoModelo?: string;

    @Column({ default: 'Sim' })
    crlvOk!: string;

    @Column({ default: 'Não' })
    historicoRisco!: string;

    // Estrutura Física ----------------------------------------------------------------
    @Column({ default: 'Íntegra' })
    longarinas!: string;

    @Column({ default: 'Íntegra' })
    colunas!: string;

    @Column({ default: 'Original' })
    cortafogo!: string;

    @Column({ default: 'Não' })
    colisaoGrave!: string;

    @Column({ type: 'text', nullable: true })
    obsEstrutura?: string;

    // Carroceria e Pintura ------------------------------------------------------------
    @Column({ type: 'decimal', nullable: true })
    pinturaEsp?: number;

    @Column({ default: 'Não' })
    tonalidade!: string;

    @Column({ default: 'Sim' })
    vidrosOrig!: string;

    @Column({ default: 'Sim' })
    faroisOrig!: string;

    @Column({ type: 'text', nullable: true })
    obsPintura?: string;

    // Anti-Enchente -------------------------------------------------------------------
    @Column({ default: 'Não' })
    oxidacao!: string;

    @Column({ default: 'Íntegros' })
    carpetes!: string;

    @Column({ default: 'Não' })
    odor!: string;

    @Column({ default: 'Ok' })
    eletricoGeral!: string;

    // OBD ----------------------------------------------------------------------------
    @Column({ default: 'Não' })
    falhasObd!: string;

    @Column({ type: 'int', nullable: true })
    kmObd?: number;

    @Column({ default: 'Sim' })
    consistenciaKm!: string;

    @Column({ default: 'Ativos' })
    airbags!: string;

    @Column({ type: 'text', nullable: true })
    obsObd?: string;

    // Mecânica -----------------------------------------------------------------------
    @Column({ default: 'Não' })
    vazamentos!: string;

    @Column({ default: 'Uniforme' })
    pneus!: string;

    @Column({ default: 'Ok' })
    suspensao!: string;

    // Testes Funcionais ---------------------------------------------------------------
    @Column({ default: 'Normal' })
    direcao!: string;

    @Column({ default: 'Normal' })
    freios!: string;

    @Column({ default: 'Ok' })
    sistemaEletrico!: string;

    // Conclusão ----------------------------------------------------------------------
    @Column({ default: 'Sem restrições relevantes' })
    statusVeiculo!: string;

    //RELAÇÃO AQUI COM O INSPETOR QUE FEZ O LAUDO

    @Column({ nullable: true })
    inspetor?: string;

    @Column({ type: 'text', nullable: true })
    observacoesFinais?: string;

    // IPA Score (calculado) -----------------------------------------------------------
    @Column({ type: 'decimal', default: 0 })
    ipaScore!: number;

    @Column({ nullable: true })
    ipaBadge?: string;

    @Column({ type: 'json', nullable: true })
    ipaNotas?: string[]; // Array de notas convertido para JSON

    // Relacionamento com fotos --------------------------------------------------------
    @OneToMany(() => FotoLaudo, foto => foto.laudo)
    fotos!: FotoLaudo[];

    // Timestamps ---------------------------------------------------------------------
    @CreateDateColumn()
    criadoEm!: Date;

    @UpdateDateColumn()
    atualizadoEm!: Date;
}