import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { PromptsPage } from './pages/prompts/PromptsPage';
import { CategoriesPage } from './pages/categories/CategoriesPage';
import { ReferencePage } from './pages/reference/ReferencePage';
import { GeneratePage } from './pages/generate/GeneratePage';
import { GalleryPage } from './pages/gallery/GalleryPage';
import { PromptGeneratorPage } from './pages/prompts/PromptGeneratorPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="prompts" element={<PromptsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="reference" element={<ReferencePage />} />
          <Route path="generate" element={<GeneratePage />} />
          <Route path="gallery" element={<GalleryPage />} />
          <Route path="prompt-generator" element={<PromptGeneratorPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
