import axios from "axios";

// Apuntamos a nuestro servidor backend en Spring Boot
const URL_BASE = "http://localhost:8080";

export const obtenerProductos = async () => {
  try {
    // 1. Rescatamos el token sagrado que guardamos al iniciar sesión con Google
    const token = sessionStorage.getItem("userToken");

    // 2. Configuramos los encabezados (Headers) para mostrarle el "carnet" al guardia de Java
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // 3. Hacemos la petición a la API enviando los headers de seguridad
    const response = await axios.get(`${URL_BASE}/api/productos`, { headers });
    
    // Devolvemos los datos del catálogo
    return response.data; 
  } catch (error) {
    console.error("Error al conectar con la API:", error);
    throw error;
  }
};