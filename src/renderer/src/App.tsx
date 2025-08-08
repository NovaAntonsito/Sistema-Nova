import React from 'react'
import { HashRouter as Router } from 'react-router-dom'
import { Layout } from './components/layout'
import { NotificationContainer } from './components/common'
import { AppRoutes } from './routes'
import './App.css'

function App(): React.JSX.Element {
  return (
    <Router>
      <div className="app">
        <Layout>
          <AppRoutes />
        </Layout>
        <NotificationContainer />
      </div>
    </Router>
  )
}

export default App
