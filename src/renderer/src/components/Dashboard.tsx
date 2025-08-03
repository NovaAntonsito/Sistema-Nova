import { UserResponseDto } from "src/main/database/dto/user.dto"


interface DashboardProps {
  user: UserResponseDto
  onLogout: () => void
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>¡Ya entré! :D</h1>
        <button className="btn-logout" onClick={onLogout}>
          Cerrar Sesión
        </button>
      </div>

      <div className="user-info">
        <h2>Información del Usuario</h2>

        <div className="user-detail">
          <strong>Nombre:</strong>
          <span>{user.nombre}</span>
        </div>

        <div className="user-detail">
          <strong>Email:</strong>
          <span>{user.email}</span>
        </div>

        <div className="user-detail">
          <strong>Teléfono:</strong>
          <span>{user.phoneNumber}</span>
        </div>

        <div className="user-detail">
          <strong>ID de Usuario:</strong>
          <span>{user.id}</span>
        </div>

        <div className="user-detail">
          <strong>Cuenta creada:</strong>
          <span>{formatDate(user.createdAt.toLocaleDateString())}</span>
        </div>

        <div className="user-detail">
          <strong>Última actualización:</strong>
          <span>{formatDate(user.createdAt.toLocaleDateString())}</span>
        </div>
      </div>

      <div
        style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          marginTop: '20px'
        }}
      >
        ¡Bienvenido al Sistema de Gestión de Presupuestos N.O.V.A!
        <div
          style={{
            fontSize: '16px',
            marginTop: '10px',
            opacity: 0.9
          }}
        >
          Autenticación exitosa - Sistema listo para usar
        </div>
      </div>
    </div>
  )
}

export default Dashboard
