import React, { useState, useEffect } from 'react'

interface Client {
  id: string
  nombre: string
  apellido?: string
  email?: string
  phoneNumber: string
  address?: string
  documentNumber?: string
  userType: string
  status: string
  createdAt: string
}

interface ViewClientsProps {
  onBack: () => void
}

const ViewClients: React.FC<ViewClientsProps> = ({ onBack }) => {
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadClients()
  }, [])

  useEffect(() => {
    filterClients()
  }, [clients, searchTerm])

  const loadClients = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('user:getClients')
      if (result.success) {
        setClients(result.data)
      } else {
        setError('Error al cargar clientes')
      }
    } catch (error) {
      console.error('Error cargando clientes:', error)
      setError('Error de conexión al cargar clientes')
    } finally {
      setIsLoading(false)
    }
  }

  const filterClients = () => {
    if (!searchTerm) {
      setFilteredClients(clients)
      return
    }

    const filtered = clients.filter((client) => {
      const fullName = `${client.nombre} ${client.apellido || ''}`.toLowerCase()
      const email = client.email?.toLowerCase() || ''
      const phone = client.phoneNumber.toLowerCase()
      const document = client.documentNumber?.toLowerCase() || ''
      const search = searchTerm.toLowerCase()

      return (
        fullName.includes(search) ||
        email.includes(search) ||
        phone.includes(search) ||
        document.includes(search)
      )
    })

    setFilteredClients(filtered)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const getClientDisplayName = (client: Client) => {
    return client.apellido ? `${client.nombre} ${client.apellido}` : client.nombre
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES')
  }

  if (isLoading) {
    return (
      <div className="view-container">
        <div className="form-header">
          <button className="back-btn" onClick={onBack}>
            ← Volver
          </button>
          <h2>Cargando clientes...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="view-container">
      <div className="form-header">
        <button className="back-btn" onClick={onBack}>
          ← Volver
        </button>
        <h2>Gestión de Clientes</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="search-section">
        <input
          type="text"
          placeholder="Buscar por nombre, email, teléfono o documento..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
        />
        <div className="results-count">
          {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''} encontrado
          {filteredClients.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="clients-grid">
        {filteredClients.length === 0 ? (
          <div className="no-results">
            {searchTerm
              ? 'No se encontraron clientes con ese criterio'
              : 'No hay clientes registrados'}
          </div>
        ) : (
          filteredClients.map((client) => (
            <div key={client.id} className="client-card">
              <div className="client-header">
                <h3>{getClientDisplayName(client)}</h3>
                <span className={`status-badge ${client.status}`}>
                  {client.status === 'active' ? 'Activo' : client.status}
                </span>
              </div>

              <div className="client-details">
                <div className="detail-item">
                  <strong>📞 Teléfono:</strong> {client.phoneNumber}
                </div>

                {client.email && (
                  <div className="detail-item">
                    <strong>📧 Email:</strong> {client.email}
                  </div>
                )}

                {client.documentNumber && (
                  <div className="detail-item">
                    <strong>🆔 Documento:</strong> {client.documentNumber}
                  </div>
                )}

                {client.address && (
                  <div className="detail-item">
                    <strong>📍 Dirección:</strong> {client.address}
                  </div>
                )}

                <div className="detail-item">
                  <strong>📅 Registrado:</strong> {formatDate(client.createdAt)}
                </div>
              </div>

              <div className="client-actions">
                <button className="btn-secondary">Editar</button>
                <button className="btn-primary">Ver Presupuestos</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ViewClients
