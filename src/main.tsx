import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router'
import { routes } from './routes/routes'
import { applyThemePreference, readThemePreference } from './lib/theme'
import './styles/index.css'

applyThemePreference(readThemePreference())

const router = createBrowserRouter(routes)
const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Elemen #root tidak ditemukan di index.html.')

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
