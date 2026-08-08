import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

// Render (plan gratuit) met le service en veille après inactivité : le réveil
// du conteneur peut prendre 30-40s, d'où un timeout généreux plutôt que la
// valeur par défaut d'axios.
export const api = axios.create({ baseURL: API_URL, timeout: 45000 });
