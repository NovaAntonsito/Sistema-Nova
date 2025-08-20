import LandingView from './views/landing/LandingView'
import UsersCreateNew from './views/user/create/UsersCreateNew'
import UsersView from './views/user/UsersView'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'

function App(): React.JSX.Element {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<LandingView />} />
          <Route path="/users" element={<UsersView />} />
          <Route path="/users-create" element={<UsersCreateNew />} />
          {/* Agrega más rutas aquí según sea necesario */}
        </Routes>
      </Router>
    </>
  )
}

export default App
