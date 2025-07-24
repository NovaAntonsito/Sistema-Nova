import { Repository, DataSource } from 'typeorm'
import { User } from '../entities/User'

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
    const query = this.createQueryBuilder('user')
      .where('user.email = :email', { email })
      .andWhere('user.isDeleted = :isDeleted', { isDeleted: false })

    if (excludeId) {
      query.andWhere('user.id != :excludeId', { excludeId })
    }

    const count = await query.getCount()
    return count > 0
  }
}
