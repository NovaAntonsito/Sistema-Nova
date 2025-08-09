import React, { ReactNode, useState } from 'react'
import Toolbar from '../toolbar/Toolbar'
import { ExportDialog, ImportDialog } from '../forms'
import './Layout.css'

interface LayoutProps {
  children: ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

  const handleOpenExportDialog = () => {
    setIsExportDialogOpen(true)
  }

  const handleCloseExportDialog = () => {
    setIsExportDialogOpen(false)
  }

  const handleOpenImportDialog = () => {
    setIsImportDialogOpen(true)
  }

  const handleCloseImportDialog = () => {
    setIsImportDialogOpen(false)
  }

  return (
    <div className="layout">
      <Toolbar onExport={handleOpenExportDialog} onImport={handleOpenImportDialog} />
      <main className="layout-content">{children}</main>

      {/* Global Dialogs */}
      <ExportDialog isOpen={isExportDialogOpen} onClose={handleCloseExportDialog} />
      <ImportDialog isOpen={isImportDialogOpen} onClose={handleCloseImportDialog} />
    </div>
  )
}

export default Layout
