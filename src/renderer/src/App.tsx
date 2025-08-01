import Versions from './components/Versions'
import UsersView from './views/UsersView'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

function App(): React.JSX.Element {
  //const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')
  
  
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<UsersView />} />
          {/* Agrega más rutas aquí según sea necesario */}
        </Routes>
      </Router>
      <Versions></Versions>
    </>
  )
}

export default App
