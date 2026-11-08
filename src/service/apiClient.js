import axios from "axios";

// 1. Centralizamos la URL del backend usando la variable de entorno
// (exportada para que otros módulos, como el formulario de pedido, usen la misma fuente)
export const URL_BASE = import.meta.env.VITE_API_BASE_URL;

// Si un servicio no responde, el GET tiene que FALLAR y no colgarse: sin este
// tope el dashboard se quedaba en "Cargando ventas…" para siempre y el aviso
// de error con su botón Reintentar jamás llegaba a verse.
// 15 s es generoso a propósito: un falso negativo en la demo es peor que la
// espera larga, y los servicios locales responden en milisegundos.
export const TIMEOUT_GET_MS = 15000;

// 2. Creamos la instancia oficial para "8 Digital"
const apiClient = axios.create({
  baseURL: URL_BASE,
});

// 3. Nuestro Interceptor Inteligente ("El Guardia de Seguridad")
apiClient.interceptors.request.use(
  (config) => {
    // Timeout SOLO en GET: abortar un POST, PUT, PATCH o DELETE a mitad de
    // camino deja el cambio aplicado en el servidor pero no en el cliente, y
    // el reintento lo repite. Esos verbos conservan el tope 0 de axios.
    config.timeout = String(config.method).toLowerCase() === "get" ? TIMEOUT_GET_MS : 0;

    // Busca el token sagrado en la sesión (Google o Admin)
    const token = sessionStorage.getItem("userToken");
    
    // Como el catálogo es privado, adjuntamos siempre el token a cualquier petición
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // API key administrativa (X-Api-Key): los endpoints protegidos del backend
    // (escrituras del catálogo, listados, estadísticas) la exigen. El valor vive
    // en el entorno (VITE_ADMIN_API_KEY), nunca en el código.
    const adminKey = import.meta.env.VITE_ADMIN_API_KEY;
    if (adminKey) {
      config.headers["X-Api-Key"] = adminKey;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;