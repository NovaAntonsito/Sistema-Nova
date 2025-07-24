import 'reflect-metadata'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm'
import { User } from './User'
import { Quota } from './Quota'
import { Status } from './Status'

@Entity()
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @CreateDateColumn()
  _creationDate: Date

  @Column('datetime')
  _expirationDate: Date

  @Column({
    type: 'simple-enum',
    enum: Status,
    default: Status.ACTIVE
  })
  currentStatus: Status

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number

  @Column('decimal', { precision: 5, scale: 2 })
  currentInterest: number

  @Column('integer')
  paymentTerm: number

  @Column('text', { unique: true })
  code: string

  @OneToMany(() => Quota, (quota) => quota.budget, { cascade: true })
  quotaList: Quota[]

  @ManyToOne(() => User, (user) => user.budgetList)
  user: User

  @Column('boolean', { default: false })
  isDeleted: boolean

  @UpdateDateColumn()
  updatedAt: Date
}
