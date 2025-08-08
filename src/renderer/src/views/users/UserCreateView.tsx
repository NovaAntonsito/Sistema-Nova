import React from 'react'
import { UserForm } from '../../components/forms'

const UserCreateView: React.FC = () => {
  const handleSuccess = () => {
    // Handle successful user creation
    console.log('User created successfully')
  }

  const handleCancel = () => {
    // Handle form cancellation
    console.log('User creation cancelled')
  }

  return (
    <div style={{ padding: '8px', width: '100%' }}>
      <UserForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}

export default UserCreateView