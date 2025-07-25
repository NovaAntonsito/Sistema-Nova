import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate
} from 'typeorm'
import { Budget } from './Budget'
import * as bcrypt from 'bcrypt'
import 'reflect-metadata'

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text' })
  nombre: string

  @Column({ type: 'text', unique: true })
  email: string

  @Column({ type: 'text', length: 255 })
  password: string

  @Column({ type: 'text' })
  phoneNumber: string

  @OneToMany(() => Budget, (budget) => budget.user)
  budgetList: Budget[]

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (this.password) {
      const saltRounds = 10
      this.password = await bcrypt.hash(this.password, saltRounds)
    }
  }

  async validatePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.password)
  }
}
