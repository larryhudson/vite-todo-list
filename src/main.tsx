// Import necessary dependencies
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Create a root for the React app and render it
// The '!' is a non-null assertion operator, telling TypeScript that we're sure 'root' exists
createRoot(document.getElementById('root')!).render(
  // Wrap the App component in StrictMode for additional checks and warnings
  <StrictMode>
    <App />
  </StrictMode>,
)
