import React from 'react'
import { useNavigate } from 'react-router-dom'

const NotFound: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{
        fontSize: '4rem',
        color: '#6b7280',
        margin: '0 0 16px 0'
      }}>
        404
      </h1>
      <h2 style={{
        fontSize: '1.5rem',
        color: '#374151',
        margin: '0 0 16px 0'
      }}>
        Página no encontrada
      </h2>
      <p style={{
        color: '#6b7280',
        marginBottom: '24px',
        maxWidth: '400px'
      }}>
        La página que estás buscando no existe o ha sido movida.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#2563eb'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#3b82f6'
        }}
      >
        Volver al inicio
      </button>
    </div>
  )
}

export default NotFound