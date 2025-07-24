import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm'
import { Budget } from './Budget'
import 'reflect-metadata'

@Entity()
export class Quota {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @CreateDateColumn()
  _creationDate: Date

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number

  @ManyToOne(() => Budget, (budget) => budget.quotaList)
  budget: Budget
}
