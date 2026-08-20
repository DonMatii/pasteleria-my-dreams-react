import { useEffect, useState } from "react";
import { obtenerProductos } from "../service/ProductosService";
import "../App.css";

function Delicias() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  // Detectamos si existe un token en la sesión
  const [isLoggedIn] = useState(!!sessionStorage.getItem("userToken"));

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
    // Si no está logueado, no intentamos consultar la API
    if (!isLoggedIn) {
      setCargando(false);
      return;
    }

    const cargarTodo = async () => {
      try {
        const datos = await obtenerProductos();
        let listaPlana = Object.values(datos).flat();

        const traductorCategorias = {
          "tortas": "Tortas",
          "queques": "Queques",
          "tartas": "Tartas",
          "personales": "Tentaciones Individuales"
        };

        listaPlana = listaPlana.map(prod => ({
          ...prod,
          categoria: traductorCategorias[prod.categoria] || prod.categoria,
          imagenUrl: prod.img,
          descripcion: prod.desc,
          precio: prod.precio ? prod.precio : 15000
        }));

        setProductos(listaPlana);
      } catch (error) {
        console.error("Error al cargar:", error);
      } finally {
        setCargando(false);
      }
    };
    cargarTodo();
  }, [isLoggedIn]);

  if (cargando) return <div className="loader">Cargando delicias...</div>;

  // Pantalla de aviso profesional si no hay sesión
if (!isLoggedIn) {
    return (
      <main className="main-content" style={{ textAlign: "center", padding: "60px 20px" }}>
        <h1 className="titulo-principal">Nuestro Catálogo</h1>
        <div style={{ marginTop: "40px", padding: "40px", border: "1px solid #e1b1b1", borderRadius: "15px", backgroundColor: "#fff5f5", maxWidth: "600px", margin: "40px auto" }}>
          {/* Aquí le cambiamos el estilo para que sea más grande y llamativo */}
          <h2 style={{ color: "#d63384", fontSize: "2.5rem", marginBottom: "15px" }}>¡Hola!</h2>
          <p style={{ fontSize: "1.2rem" }}>Para ver nuestras creaciones exclusivas, por favor inicia sesión.</p>
          <a href="/login" className="boton-principal" style={{ display: "inline-block", marginTop: "25px", textDecoration: "none", padding: "12px 24px", fontSize: "1.1rem" }}>
            Ir a Iniciar Sesión
          </a>
        </div>
      </main>
    );
  }

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
                    <img src={`/img/${prod.imagenUrl}`} alt={prod.nombre} />
                  </div>
                  <div className="info">
                    <h3>{prod.nombre}</h3>
                    <p className="producto-descripcion">{prod.descripcion}</p>
                    <span className="precio-tag">
                      ${Number(prod.precio).toLocaleString("es-CL")}
                    </span>
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