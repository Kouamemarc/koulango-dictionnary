import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import LoginPage from "./pages/LoginPage";
import PendingPage from "./pages/PendingPage";
import WordsPage from "./pages/WordsPage";
import WordFormPage from "./pages/WordFormPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="page">Chargement…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><PendingPage /></RequireAuth>} />
      <Route path="/words" element={<RequireAuth><WordsPage /></RequireAuth>} />
      <Route path="/words/new" element={<RequireAuth><WordFormPage /></RequireAuth>} />
      <Route path="/words/:id/edit" element={<RequireAuth><WordFormPage /></RequireAuth>} />
    </Routes>
  );
}
