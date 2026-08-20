import axios from "axios";

// 1. Centralizamos la URL del backend local
const URL_BASE = "http://localhost:8080";

// 2. Creamos la instancia oficial para "8 Digital"
const apiClient = axios.create({
  baseURL: URL_BASE,
});

// 3. Nuestro Interceptor ("El Guardia de Seguridad")
apiClient.interceptors.request.use(
  (config) => {
    // Busca el token sagrado en la sesión
    const token = sessionStorage.getItem("userToken");
    
    // Si hay token, lo pega en la cabecera automáticamente
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