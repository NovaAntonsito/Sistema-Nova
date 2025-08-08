import React, { useState } from 'react'
import { BudgetForm } from '../components/forms'
import { BudgetList } from '../components/lists'
import { Modal } from '../components/common'
import { Budget } from '../services/BudgetService'
import './BudgetView.css'

const BudgetView: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleCreateBudget = () => {
    setSelectedBudget(null)
    setIsCreateModalOpen(true)
  }

  const handleEditBudget = (budget: Budget) => {
    setSelectedBudget(budget)
    setIsEditModalOpen(true)
  }

  const handleBudgetSelect = (budget: Budget) => {
    // For now, just log the selection. Could be used for detailed view
    console.log('Budget selected:', budget)
  }

  const handleFormSuccess = (_budget: Budget) => {
    // Refresh the list
    setRefreshTrigger(prev => prev + 1)
    
    // Close modals
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setSelectedBudget(null)
  }

  const handleFormCancel = () => {
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setSelectedBudget(null)
  }

  return (
    <div className="budget-view">
      <div className="budget-view-header">
        <h1>Gestión de Presupuestos</h1>
        <button
          onClick={handleCreateBudget}
          className="btn btn--primary btn--large"
        >
          + Crear Presupuesto
        </button>
      </div>

      <div className="budget-view-content">
        <BudgetList
          onBudgetEdit={handleEditBudget}
          onBudgetSelect={handleBudgetSelect}
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Create Budget Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleFormCancel}
        title="Crear Nuevo Presupuesto"
        size="large"
      >
        <BudgetForm
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>

      {/* Edit Budget Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleFormCancel}
        title="Editar Presupuesto"
        size="large"
      >
        <BudgetForm
          budget={selectedBudget}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </Modal>
    </div>
  )
}

export default BudgetView