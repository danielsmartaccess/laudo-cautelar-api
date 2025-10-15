import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { Laudo } from "./Laudo";

@Entity()
export class FotoLaudo {
    @PrimaryGeneratedColumn()
    id!: number;

    // Nome do arquivo salvo no disco
    @Column()
    nomeArquivo!: string;

    // Caminho físico para o arquivo salvo (para remoção posterior)
    @Column()
    caminhoArquivo!: string;

    @Column({ nullable: true })
    tamanhoArquivo?: number;

    @Column({ nullable: true })
    tipoMime?: string;

    @Column({ type: 'text', nullable: true })
    descricao?: string;

    // Relacionamento com Laudo: várias fotos pertencem a um laudo
    @ManyToOne(() => Laudo, laudo => laudo.fotos, { onDelete: 'CASCADE' })
    laudo!: Laudo;

    @CreateDateColumn()
    criadoEm!: Date;
}