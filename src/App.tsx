import { HashRouter, Route, Routes } from 'react-router-dom'
import BrowserPage from './pages/BrowserPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<BrowserPage />} />
      </Routes>
    </HashRouter>
  )
}
