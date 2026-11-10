// La foto del producto puede venir de tres formas: un archivo legacy del
// catalogo ("tortaSelvaNegra.jpg"), una URL relativa del storage del backend
// ("/uploads/abc.jpg") o una URL absoluta (S3/CloudFront al migrar a AWS).
// Este helper unifica el criterio en todas las pantallas sin romper los
// productos existentes, que siguen apuntando a /img del front.
export const resolverUrlImagen = (imagenUrl) => {
  const valor = (imagenUrl ?? "").trim();
  if (!valor) return "";
  if (/^(https?:)?\/\//i.test(valor) || valor.startsWith("/")) return valor;
  return `/img/${valor}`;
};
