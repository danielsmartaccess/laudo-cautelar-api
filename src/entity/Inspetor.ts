import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Inspetor {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true })
    email!: string;

    @Column()
    nome!: string;

    // Armazene sempre hash da senha (nunca texto puro). Aqui é apenas campo de exemplo.
    @Column()
    senha!: string; // Hash da senha

    @Column({ nullable: true })
    telefone?: string;

    @Column({ nullable: true })
    registro?: string; // Número do registro profissional

    @Column({ default: true })
    ativo!: boolean;

    @CreateDateColumn()
    criadoEm!: Date;

    @UpdateDateColumn()
    atualizadoEm!: Date;
}