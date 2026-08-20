import axios from "axios";

// 1. Centralizamos la URL del backend local
const URL_BASE = "http://localhost:8080";

// 2. Creamos la instancia oficial para "8 Digital"
const apiClient = axios.create({
  baseURL: URL_BASE,
});

// 3. Nuestro Interceptor Inteligente ("El Guardia de Seguridad")
apiClient.interceptors.request.use(
  (config) => {
    // Busca el token sagrado en la sesión
    const token = sessionStorage.getItem("userToken");
    
    // DETALLE CLAVE: Si es una petición GET para ver el catálogo, 
    // no adjuntamos el token para evitar conflictos con el bypass del admin en rutas públicas.
    const esGetPublico = config.method === "get" && config.url.includes("/api/productos");

    if (token && !esGetPublico) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;