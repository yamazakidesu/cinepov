import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/layout.css'
import './styles/seatplan.css'
import './styles/pov.css'
import './styles/checkout.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)