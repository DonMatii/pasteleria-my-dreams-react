import axios from "axios";

// ¡Ahora apuntamos a nuestro propio servidor backend en Spring Boot!
const URL_BASE = "http://localhost:8080";

export const obtenerProductos = async () => {
  try {
    // Aquí es donde realmente se "llama" a la API
    const response = await axios.get(`${URL_BASE}/api/productos`);
    
    // Devolvemos solo los datos que nos interesan
    return response.data; 
  } catch (error) {
    console.error("Error al conectar con la API:", error);
    throw error;
  }
};