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

export enum UserType {
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
  CLIENT = 'client'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text' })
  nombre: string

  @Column({ type: 'text', nullable: true })
  apellido?: string

  @Column({ type: 'text', unique: true, nullable: true })
  email?: string

  @Column({ type: 'text', length: 255, nullable: true })
  password?: string

  @Column({ type: 'text' })
  phoneNumber: string

  @Column({ type: 'text', nullable: true })
  address?: string

  @Column({ type: 'text', nullable: true })
  documentNumber?: string // DNI, Cédula, etc.

  @Column({
    type: 'text',
    enum: UserType,
    default: UserType.CLIENT
  })
  userType: UserType

  @Column({
    type: 'text',
    enum: UserStatus,
    default: UserStatus.ACTIVE
  })
  status: UserStatus

  @Column({ type: 'boolean', default: false })
  requiresLogin: boolean // Indica si el usuario necesita login

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
    // Solo hashear la contraseña si existe y el usuario requiere login
    if (this.password && this.requiresLogin) {
      const saltRounds = 10
      this.password = await bcrypt.hash(this.password, saltRounds)
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  validateUserData(): void {
    // Si el usuario requiere login, debe tener email y password
    if (this.requiresLogin) {
      if (!this.email) {
        throw new Error('Email es requerido para usuarios que requieren login')
      }
      if (!this.password) {
        throw new Error('Password es requerido para usuarios que requieren login')
      }
    }

    // Los administradores y empleados siempre requieren login
    if (this.userType === UserType.ADMIN || this.userType === UserType.EMPLOYEE) {
      this.requiresLogin = true
      if (!this.email) {
        throw new Error('Email es requerido para administradores y empleados')
      }
      if (!this.password) {
        throw new Error('Password es requerido para administradores y empleados')
      }
    }
  }

  async validatePassword(plainPassword: string): Promise<boolean> {
    if (!this.password || !this.requiresLogin) {
      return false
    }
    return bcrypt.compare(plainPassword, this.password)
  }

  // Método para verificar si el usuario puede hacer login
  canLogin(): boolean {
    return (
      this.requiresLogin &&
      this.status === UserStatus.ACTIVE &&
      !this.isDeleted &&
      !!this.email &&
      !!this.password
    )
  }

  // Método para obtener el nombre completo
  getFullName(): string {
    return this.apellido ? `${this.nombre} ${this.apellido}` : this.nombre
  }

  // Método para verificar si es administrador
  isAdmin(): boolean {
    return this.userType === UserType.ADMIN
  }

  // Método para verificar si es empleado
  isEmployee(): boolean {
    return this.userType === UserType.EMPLOYEE
  }

  // Método para verificar si es cliente
  isClient(): boolean {
    return this.userType === UserType.CLIENT
  }
}
