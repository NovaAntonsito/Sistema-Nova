import React, { useState } from 'react'
import UserForm from '../../components/forms/UserForm'
import UserList from '../../components/lists/UserList'
import Modal from '../../components/common/Modal'
import NotificationContainer from '../../components/common/NotificationContainer'
import { User } from '../../services/UserService'
import './UserView.css'

const UserView: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleCreateUser = () => {
    setSelectedUser(null)
    setIsCreateModalOpen(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setIsEditModalOpen(true)
  }

  const handleUserSelect = (user: User) => {
    // For now, just show user details in console
    // This could be expanded to show a detail view
    console.log('Selected user:', user)
  }

  const handleFormSuccess = () => {
    // Refresh the user list
    setRefreshTrigger(prev => prev + 1)
    // Close modals
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setSelectedUser(null)
  }

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false)
    setSelectedUser(null)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedUser(null)
  }

  return (
    <div className="user-view">
      <NotificationContainer />
      
      <div className="user-view-header">
        <div className="header-content">
          <h1>Gestión de Usuarios</h1>
          <p className="header-description">
            Administra los usuarios del sistema. Puedes crear nuevos usuarios, editar información existente y eliminar usuarios cuando sea necesario.
          </p>
        </div>
        <div className="header-actions">
          <button
            onClick={handleCreateUser}
            className="btn btn--primary btn--large"
          >
            + Crear Usuario
          </button>
        </div>
      </div>

      <div className="user-view-content">
        <UserList
          onUserEdit={handleEditUser}
          onUserSelect={handleUserSelect}
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title="Crear Nuevo Usuario"
        size="medium"
      >
        <UserForm
          onSuccess={handleFormSuccess}
          onCancel={handleCloseCreateModal}
        />
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title="Editar Usuario"
        size="medium"
      >
        <UserForm
          user={selectedUser}
          onSuccess={handleFormSuccess}
          onCancel={handleCloseEditModal}
        />
      </Modal>
    </div>
  )
}

export default UserView