
import { useEffect, useState } from 'react'
import './UsersView.css'
import {UserResponseDto} from "../../../../main/database/dto/user.dto"
import { GetUsers } from '@renderer/service/user/UserService'
const UsersView = () => {
  const [users, setUsers] = useState<UserResponseDto[]>([])
  const [loading, setLoading] = useState(true)

  const getData = async () => {
    try {
      let res = await GetUsers();
      console.log(res);
      
      setLoading(true)
    } catch (error) {
      console.error('Error al cargar usuarios:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (userId: string) => {
    // TODO: Implementar lógica de edición
    console.log('Editar usuario:', userId)
  }

  const handleDelete = (userId: string) => {
    // TODO: Implementar lógica de eliminación
    console.log('Eliminar usuario:', userId)
  }

  useEffect(() => {
    getData()
  }, [])

  if (loading) {
    return (
      <div className="users-view">
        <p className="loading-message">Cargando usuarios...</p>
      </div>
    )
  }

  return (
    <div className="users-view">
      <h2>Gestión de Usuarios</h2>
      
      {users.length === 0 ? (
        <p className="no-users-message">No hay usuarios registrados</p>
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Fecha Creación</th>
              <th className="actions-header">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.nombre}</td>
                <td>{user.email}</td>
                <td>{user.phoneNumber}</td>
                <td>{new Date(user.createdAt).toLocaleDateString('es-ES')}</td>
                <td className="actions-cell">
                  <button onClick={() => handleEdit(user.id)} className="btn-edit">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(user.id)} className="btn-delete">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default UsersView
