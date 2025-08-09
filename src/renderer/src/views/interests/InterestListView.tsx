import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getAllInterests,
  deleteInterest,
  createDefaultInterestConfigurations,
  Interest
} from '../../services/InterestService'
import { LoadingSpinner } from '../../components/common'
import './InterestListView.css'

const InterestListView: React.FC = () => {
  const [interests, setInterests] = useState<Interest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadInterests()
  }, [])

  const loadInterests = async () => {
    try {
      setLoading(true)
      const response = await getAllInterests()
      if (response.success) {
        setInterests(response.data || [])
      } else {
        setError(response.error || 'Error al cargar configuraciones de interés')
      }
    } catch (err) {
      setError('Error al cargar configuraciones de interés')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta configuración de interés?')) {
      try {
        const response = await deleteInterest(id)
        if (response.success) {
          await loadInterests()
        } else {
          setError(response.error || 'Error al eliminar configuración de interés')
        }
      } catch (err) {
        setError('Error al eliminar configuración de interés')
      }
    }
  }

  const handleCreateDefaults = async () => {
    if (window.confirm('¿Desea crear las configuraciones de interés por defecto?')) {
      try {
        const response = await createDefaultInterestConfigurations()
        if (response.success) {
          await loadInterests()
        } else {
          setError(response.error || 'Error al crear configuraciones por defecto')
        }
      } catch (err) {
        setError('Error al crear configuraciones por defecto')
      }
    }
  }

  if (loading) {
    return <LoadingSpinner size="large" message="Cargando configuraciones de interés..." />
  }

  return (
    <div className="interest-list-view">
      <div className="view-header">
        <h1>Configuraciones de Interés</h1>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={handleCreateDefaults}
            disabled={interests.length > 0}
          >
            Crear Configuraciones por Defecto
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/interests/create')}
          >
            Nueva Configuración
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="interests-container">
        {interests.length === 0 ? (
          <div className="empty-state">
            <h3>No hay configuraciones de interés</h3>
            <p>Cree una nueva configuración o use las configuraciones por defecto.</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/interests/create')}
            >
              Crear Primera Configuración
            </button>
          </div>
        ) : (
          <div className="interests-grid">
            {interests.map((interest) => (
              <div key={interest.id} className="interest-card">
                <div className="interest-header">
                  <h3>{interest.paymentTerm} meses</h3>
                  <div className="interest-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => navigate(`/interests/edit/${interest.id}`)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(interest.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="interest-details">
                  <div className="detail-item">
                    <span className="label">Tasa de Interés:</span>
                    <span className="value">{interest.interest}%</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Creado:</span>
                    <span className="value">
                      {new Date(interest.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Actualizado:</span>
                    <span className="value">
                      {new Date(interest.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default InterestListView