import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useIsDark } from "./useIsDark";
import HomePage from "./pages/HomePage";
import WordDetailPage from "./pages/WordDetailPage";
import ContributePage from "./pages/ContributePage";
import AssistantPage from "./pages/AssistantPage";
import AboutPage from "./pages/AboutPage";
import ModeratorPage from "./pages/ModeratorPage";
import ContactPage from "./pages/ContactPage";
import ImportContributionPage from "./pages/ImportContributionPage";
import FavoritesPage from "./pages/FavoritesPage";
import HistoryPage from "./pages/HistoryPage";

export default function App() {
  const isDark = useIsDark();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/mots/:id" element={<WordDetailPage />} />
        <Route path="/contribuer" element={<ContributePage />} />
        <Route path="/contribuer/importer" element={<ImportContributionPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/a-propos" element={<AboutPage />} />
        <Route path="/devenir-moderateur" element={<ModeratorPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/favoris" element={<FavoritesPage />} />
        <Route path="/historique" element={<HistoryPage />} />
      </Routes>
    </Layout>
  );
}
