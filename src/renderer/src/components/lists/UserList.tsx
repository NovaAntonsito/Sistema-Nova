import React, { useState, useEffect, useMemo } from 'react'
import { getAllUsers, deleteUser, User } from '../../services/UserService'
import { useNotification } from '../../hooks/useNotification'
import './UserList.css'

interface UserListProps {
  onUserEdit?: (user: User) => void
  onUserSelect?: (user: User) => void
  refreshTrigger?: number // Used to trigger refresh from parent
}

const UserList: React.FC<UserListProps> = ({ onUserEdit, onUserSelect, refreshTrigger }) => {
  const { addNotification } = useNotification()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<keyof User>('nombre')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Load users on component mount and when refreshTrigger changes
  useEffect(() => {
    loadUsers()
  }, [refreshTrigger])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const result = await getAllUsers()
      if (result.success && result.data) {
        setUsers(result.data)
      } else {
        addNotification({
          type: 'error',
          message: result.error || 'Error al cargar usuarios'
        })
      }
    } catch (error) {
      console.error('Error loading users:', error)
      addNotification({
        type: 'error',
        message: 'Error inesperado al cargar usuarios'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (user: User) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${user.nombre}"?`)) {
      return
    }

    try {
      const result = await deleteUser(user.id)
      if (result.success) {
        addNotification({
          type: 'success',
          message: 'Usuario eliminado exitosamente'
        })
        // Remove user from local state
        setUsers(prev => prev.filter(u => u.id !== user.id))
      } else {
        addNotification({
          type: 'error',
          message: result.error || 'Error al eliminar usuario'
        })
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      addNotification({
        type: 'error',
        message: 'Error inesperado al eliminar usuario'
      })
    }
  }

  const handleSort = (field: keyof User) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = users.filter(user =>
        user.nombre.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.phoneNumber.toLowerCase().includes(term)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date = a[sortField]
      let bValue: string | number | Date = b[sortField]

      // Handle date fields
      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        aValue = new Date(aValue as string).getTime()
        bValue = new Date(bValue as string).getTime()
      }

      // Handle string fields
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1
      }
      return 0
    })

    return filtered
  }, [users, searchTerm, sortField, sortDirection])

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSortIcon = (field: keyof User) => {
    if (sortField !== field) return '↕️'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  if (isLoading) {
    return (
      <div className="user-list">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando usuarios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="user-list">
      <div className="user-list-header">
        <h3>Lista de Usuarios ({users.length})</h3>
        <div className="user-list-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button
            onClick={loadUsers}
            className="btn btn--secondary btn--small"
            disabled={isLoading}
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {filteredAndSortedUsers.length === 0 ? (
        <div className="empty-state">
          {searchTerm ? (
            <p>No se encontraron usuarios que coincidan con "{searchTerm}"</p>
          ) : (
            <p>No hay usuarios registrados</p>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="user-table">
            <thead>
              <tr>
                <th
                  className="sortable"
                  onClick={() => handleSort('nombre')}
                >
                  Nombre {getSortIcon('nombre')}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort('email')}
                >
                  Email {getSortIcon('email')}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort('phoneNumber')}
                >
                  Teléfono {getSortIcon('phoneNumber')}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort('createdAt')}
                >
                  Fecha Creación {getSortIcon('createdAt')}
                </th>
                <th className="actions-column">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedUsers.map(user => (
                <tr
                  key={user.id}
                  className="user-row"
                  onClick={() => onUserSelect && onUserSelect(user)}
                >
                  <td className="user-name">{user.nombre}</td>
                  <td className="user-email">{user.email}</td>
                  <td className="user-phone">{user.phoneNumber}</td>
                  <td className="user-date">{formatDate(user.createdAt)}</td>
                  <td className="user-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onUserEdit && onUserEdit(user)
                      }}
                      className="btn btn--small btn--primary"
                      title="Editar usuario"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(user)
                      }}
                      className="btn btn--small btn--danger"
                      title="Eliminar usuario"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default UserList