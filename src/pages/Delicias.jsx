import { useEffect, useState } from "react";
import { obtenerProductos, obtenerDeliciaDelDia, aplanarCatalogo } from "../service/ProductosService";
import { useCarrito } from "../context/CarritoContext";
import { pedirCantidad } from "../utils/pedirCantidad";
import { toastAgregado } from "../utils/toastAgregado";
import "../App.css";

function Delicias() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [deliciaDelDia, setDeliciaDelDia] = useState(null); // producto con -10% de hoy
  const { agregarAlCarrito } = useCarrito();

  const secciones = [
    { titulo: "Sabores Frutales", cats: ["Sabores Frutales", "Pies", "Kutchen", "Tartas"] },
    { titulo: "Nuestras Tortas", cats: ["Nuestras Tortas", "Tortas"] },
    {
      titulo: "Tentaciones Individuales",
      cats: ["Tentaciones Individuales", "Brownies", "Donas", "Muffins", "Cupcakes", "Rollos", "Tartaletas", "Alfajores"],
    },
    { titulo: "Queques Artesanales", cats: ["Queques Artesanales", "Queques"] },
  ];

  useEffect(() => {
    const cargarTodo = async () => {
      try {
        const datos = await obtenerProductos();
        setProductos(aplanarCatalogo(datos));
      } catch (error) {
        console.error("Error al cargar:", error);
      }

      // La delicia del día viene del backend (mismo sorteo que el Home);
      // si falla, el catálogo se muestra igual, solo que sin badge
      try {
        const delicia = await obtenerDeliciaDelDia();
        if (delicia && delicia.id != null) setDeliciaDelDia(delicia);
      } catch (error) {
        console.error("Error al cargar la delicia del día en Delicias:", error);
      } finally {
        setCargando(false);
      }
    };
    cargarTodo();
  }, []);

  const manejarAgregar = async (prod) => {
    const cantidad = await pedirCantidad(prod);

    if (cantidad) {
      agregarAlCarrito(prod, cantidad);
      toastAgregado(prod.nombre, prod.imagenUrl);
    }
  };

  if (cargando)
    return (
      <div className="loader-container">
        <div className="spinner" />
        <p className="loader-texto">Cargando delicias...</p>
      </div>
    );

  return (
    <main className="main-content">
      <h1 className="titulo-principal">Nuestro Catálogo</h1>

      {secciones.map((sec) => {
        const itemsFiltrados = productos.filter((p) => sec.cats.includes(p.categoria));
        if (itemsFiltrados.length === 0) return null;

        return (
          <section key={sec.titulo} className="seccion-catalogo">
            <h2 className="titulo-seccion">{sec.titulo}</h2>
            <div className="vitrina">
              {itemsFiltrados.map((prod) => (
                <div className="producto" key={prod.id}>
                  <div className="img-wrapper">
                    {/* Badge de la delicia del día: solo el backend confirma el descuento */}
                    {deliciaDelDia && prod.id === deliciaDelDia.id && (
                      <span className="delicia-badge" data-testid="badge-delicia">-10% hoy</span>
                    )}
                    <img 
                      src={`/img/${prod.imagenUrl}`} 
                      alt={prod.nombre} 
                      onError={(e) => { e.target.src = '/img/tortaMoka.jpg'; }} 
                    />
                  </div>
                  <div className="info">
                    <h3>{prod.nombre}</h3>
                    <p className="producto-descripcion">{prod.descripcion}</p>
                    <span className="precio-tag">
                      ${Number(prod.precio).toLocaleString("es-CL")}
                    </span>
                    <button
                      type="button"
                      className="boton-agregar"
                      onClick={() => manejarAgregar(prod)}
                    >
                      Agregar al carrito
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}

export default Delicias;