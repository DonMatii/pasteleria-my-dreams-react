import apiClient from "./apiClient";

export const obtenerProductos = async () => {
  try {
    const response = await apiClient.get("/api/productos");
    return response.data; 
  } catch (error) {
    console.error("Error al conectar con la API en obtenerProductos:", error);
    throw error;
  }
};

// La API devuelve un mapa agrupado por categoria; esto lo aplana a una lista
// y unifica los nombres de campos por si vienen distintos desde la base.
export const aplanarCatalogo = (datos) => {
  const traductorCategorias = {
    tortas: "Tortas",
    queques: "Queques",
    tartas: "Tartas",
    personales: "Tentaciones Individuales",
  };

  return Object.values(datos || {})
    .flat()
    .map((prod) => ({
      ...prod,
      categoria: traductorCategorias[prod.categoria] || prod.categoria,
      imagenUrl: prod.imagenUrl || prod.imagen || prod.img || "",
      descripcion: prod.descripcion || prod.desc || "",
      precio: prod.precio ? Number(prod.precio) : 15000,
    }));
};

// La delicia del día la decide el backend (misma para todos los usuarios
// en un mismo día calendario). Si el endpoint falla (red o 404), el
// llamador decide el fallback; aquí se propaga el error tal cual.
export const obtenerDeliciaDelDia = async () => {
  try {
    const response = await apiClient.get("/api/productos/delicia-del-dia");
    return response.data;
  } catch (error) {
    console.error("Error al obtener la delicia del día:", error);
    throw error;
  }
};

export const crearProducto = async (producto) => {
  try {
    const response = await apiClient.post("/api/productos", producto);
    return response.data;
  } catch (error) {
    console.error("Error al crear producto:", error);
    throw error;
  }
};

export const actualizarProducto = async (id, producto) => {
  try {
    const response = await apiClient.put(`/api/productos/${id}`, producto);
    return response.data;
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    throw error;
  }
};

export const eliminarProducto = async (id) => {
  try {
    const response = await apiClient.delete(`/api/productos/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    throw error;
  }
};

// Sube la foto de un producto al storage del catalogo (disco local en dev,
// S3 al migrar a AWS) y devuelve la URL publica que viaja en el imagenUrl
// del producto. El archivo viaja como multipart; el apiClient agrega solo el
// X-Api-Key administrativo. Nunca se toca la carpeta del front.
export const subirImagenProducto = async (archivo) => {
  try {
    const formData = new FormData();
    formData.append("archivo", archivo);
    const response = await apiClient.post("/api/productos/imagen", formData);
    return response.data.url;
  } catch (error) {
    console.error("Error al subir la imagen:", error);
    throw error;
  }
};