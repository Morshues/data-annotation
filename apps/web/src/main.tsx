import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import './index.css'
import App from './App.tsx'
import { ProjectLayout } from './ProjectLayout.tsx'
import { AnnotationsPage } from './pages/AnnotationsPage.tsx'
import { DocumentPage } from './pages/DocumentPage.tsx'
import { ProjectHomePage } from './pages/ProjectHomePage.tsx'
import { ProjectsPage } from './pages/ProjectsPage.tsx'
import { RootRedirect } from './pages/RootRedirect.tsx'
import { TableImportPage } from './pages/TableImportPage.tsx'
import { TagsPage } from './pages/TagsPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<RootRedirect />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectLayout />}>
            <Route index element={<ProjectHomePage />} />
            <Route path="documents/:id" element={<DocumentPage />} />
            <Route
              path="documents/:id/annotations"
              element={<AnnotationsPage />}
            />
            <Route path="annotations" element={<AnnotationsPage />} />
            <Route path="tags" element={<TagsPage />} />
            <Route path="import" element={<TableImportPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
