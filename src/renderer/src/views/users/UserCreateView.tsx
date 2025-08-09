import React from 'react'
import { useNavigate } from 'react-router-dom'
import { UserForm } from '../../components/forms'
import { User } from '../../services/UserService'
import './UserCreateView.css'

const UserCreateView: React.FC = () => {
  const navigate = useNavigate()

  const handleSuccess = (user: User) => {
    // Navigate back to users list after successful creation
    navigate('/users')
  }

  const handleCancel = () => {
    // Navigate back to users list or home
    navigate('/users')
  }

  return (
    <div className="user-create-view">
      <div className="content-wrapper">
        <div className="page-header">
          <h1 className="page-title">Crear Nuevo Usuario</h1>
          <p className="page-description">
            Complete el formulario para crear un nuevo usuario en el sistema
          </p>
        </div>

        <div className="form-container">
          <UserForm onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
      </div>
    </div>
  )
}

export default UserCreateView
