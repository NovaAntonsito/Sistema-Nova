import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm'
import { Budget } from './Budget'
import 'reflect-metadata'

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('text')
  nombre: string

  @Column('text', { unique: true })
  email: string

  @Column('text')
  phoneNumber: string

  @OneToMany(() => Budget, (budget) => budget.user)
  budgetList: Budget[]

  @Column('boolean', { default: false })
  isDeleted: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
