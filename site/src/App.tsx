import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { StoreProvider } from './lib/store'
import Home from './pages/Home'
import AppPage from './pages/AppPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app" element={<StoreProvider><AppPage /></StoreProvider>} />
      </Routes>
    </BrowserRouter>
  )
}
