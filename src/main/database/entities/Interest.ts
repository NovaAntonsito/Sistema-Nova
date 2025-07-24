import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import 'reflect-metadata'

@Entity()
export class Interest {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('integer', { unique: true })
  paymentTerm: number

  @Column('decimal', { precision: 5, scale: 2 })
  interest: number

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
