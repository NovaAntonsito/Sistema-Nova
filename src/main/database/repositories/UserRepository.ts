import { Repository, DataSource } from 'typeorm'
import { User, UserType, UserStatus } from '../entities/User'

export class UserRepository extends Repository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource.createEntityManager())
  }

  /**
   * Encuentra todos los usuarios excluyendo los eliminados lógicamente
   */
  async findAllActive(): Promise<User[]> {
    return this.find({
      where: { isDeleted: false },
      relations: ['budgetList']
    })
  }

  /**
   * Encuentra un usuario por ID excluyendo los eliminados lógicamente
   */
  async findActiveById(id: string): Promise<User | null> {
    return this.findOne({
      where: { id, isDeleted: false },
      relations: ['budgetList']
    })
  }

  /**
   * Busca usuarios por email (coincidencia exacta)
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({
      where: { email, isDeleted: false },
      relations: ['budgetList']
    })
  }

  /**
   * Busca usuarios por nombre (coincidencia parcial, insensible a mayúsculas)
   */
  async findByNombre(nombre: string): Promise<User[]> {
    return this.createQueryBuilder('user')
      .leftJoinAndSelect('user.budgetList', 'budget')
      .where('user.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('LOWER(user.nombre) LIKE LOWER(:nombre)', { nombre: `%${nombre}%` })
      .getMany()
  }

  /**
   * Realiza la eliminación lógica de un usuario
   */
  async logicalDelete(id: string): Promise<void> {
    await this.update(id, { isDeleted: true })
  }

  /**
   * Restaura un usuario eliminado lógicamente
   */
  async restoreUser(id: string): Promise<void> {
    await this.update(id, { isDeleted: false })
  }

  /**
   * Verifica si el email existe (excluyendo usuarios eliminados)
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    if (!email) return false

    const query = this.createQueryBuilder('user')
      .where('user.email = :email', { email })
      .andWhere('user.isDeleted = :isDeleted', { isDeleted: false })

    if (excludeId) {
      query.andWhere('user.id != :excludeId', { excludeId })
    }

    const count = await query.getCount()
    return count > 0
  }

  /**
   * Busca usuarios por tipo
   */
  async findByUserType(userType: UserType): Promise<User[]> {
    return this.find({
      where: { userType, isDeleted: false },
      relations: ['budgetList']
    })
  }

  /**
   * Busca usuarios por estado
   */
  async findByStatus(status: UserStatus): Promise<User[]> {
    return this.find({
      where: { status, isDeleted: false },
      relations: ['budgetList']
    })
  }

  /**
   * Busca usuarios que requieren login
   */
  async findUsersWithLogin(): Promise<User[]> {
    return this.find({
      where: { requiresLogin: true, isDeleted: false },
      relations: ['budgetList']
    })
  }

  /**
   * Busca usuarios por número de documento
   */
  async findByDocumentNumber(documentNumber: string): Promise<User | null> {
    if (!documentNumber) return null

    return this.findOne({
      where: { documentNumber, isDeleted: false },
      relations: ['budgetList']
    })
  }

  /**
   * Busca usuarios por teléfono
   */
  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return this.findOne({
      where: { phoneNumber, isDeleted: false },
      relations: ['budgetList']
    })
  }

  /**
   * Busca usuarios por nombre completo (nombre + apellido)
   */
  async findByFullName(searchTerm: string): Promise<User[]> {
    return this.createQueryBuilder('user')
      .leftJoinAndSelect('user.budgetList', 'budget')
      .where('user.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere(
        "(LOWER(user.nombre) LIKE LOWER(:searchTerm) OR LOWER(user.apellido) LIKE LOWER(:searchTerm) OR LOWER(CONCAT(user.nombre, ' ', user.apellido)) LIKE LOWER(:searchTerm))",
        { searchTerm: `%${searchTerm}%` }
      )
      .getMany()
  }

  /**
   * Obtiene estadísticas de usuarios
   */
  async getUserStats(): Promise<{
    total: number
    active: number
    clients: number
    admins: number
    employees: number
    withLogin: number
  }> {
    const total = await this.count({ where: { isDeleted: false } })
    const active = await this.count({ where: { isDeleted: false, status: UserStatus.ACTIVE } })
    const clients = await this.count({ where: { isDeleted: false, userType: UserType.CLIENT } })
    const admins = await this.count({ where: { isDeleted: false, userType: UserType.ADMIN } })
    const employees = await this.count({ where: { isDeleted: false, userType: UserType.EMPLOYEE } })
    const withLogin = await this.count({ where: { isDeleted: false, requiresLogin: true } })

    return { total, active, clients, admins, employees, withLogin }
  }
}
