import axios from "axios";

// 1. Centralizamos la URL del backend usando la variable de entorno
const URL_BASE = import.meta.env.VITE_API_BASE_URL;

// 2. Creamos la instancia oficial para "8 Digital"
const apiClient = axios.create({
  baseURL: URL_BASE,
});

// 3. Nuestro Interceptor Inteligente ("El Guardia de Seguridad")
apiClient.interceptors.request.use(
  (config) => {
    // Busca el token sagrado en la sesión (Google o Admin)
    const token = sessionStorage.getItem("userToken");
    
    // Como el catálogo es privado, adjuntamos siempre el token a cualquier petición
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;