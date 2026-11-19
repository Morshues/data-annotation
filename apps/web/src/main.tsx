import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import './index.css'
import App from './App.tsx'
import { AnnotationsPage } from './pages/AnnotationsPage.tsx'
import { DocumentPage } from './pages/DocumentPage.tsx'
import { HomePage } from './pages/HomePage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<HomePage />} />
          <Route path="documents/:id" element={<DocumentPage />} />
          <Route
            path="documents/:id/annotations"
            element={<AnnotationsPage />}
          />
          <Route path="annotations" element={<AnnotationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
