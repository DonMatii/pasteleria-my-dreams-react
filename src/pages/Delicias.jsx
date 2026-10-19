import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { obtenerProductos } from "../service/ProductosService";
import { useCarrito } from "../context/CarritoContext";
import "../App.css";

function Delicias() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [agregado, setAgregado] = useState(null); // nombre del producto agregado recién
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
          // Unificamos para capturar el nombre de la imagen sin importar cómo venga de la BD
          imagenUrl: prod.imagenUrl || prod.imagen || prod.img,
          descripcion: prod.descripcion || prod.desc,
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
  }, []);

  const manejarAgregar = async (prod) => {
    const { value: cantidad } = await Swal.fire({
      title: prod.nombre,
      html: `
        <p class="swal-texto">¿Cuántos quieres agregar a tu carrito de compras?</p>
        <div class="selector-cantidad">
          <button type="button" class="btn-cantidad" id="btn-menos" aria-label="Restar cantidad">−</button>
          <input type="number" id="input-cantidad" value="1" min="1" readonly />
          <button type="button" class="btn-cantidad" id="btn-mas" aria-label="Sumar cantidad">+</button>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Agregar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d95386",
      cancelButtonColor: "#b04e6f",
      didOpen: () => {
        const input = document.getElementById("input-cantidad");
        document.getElementById("btn-menos").addEventListener("click", () => {
          const val = Number(input.value);
          if (val > 1) input.value = val - 1;
        });
        document.getElementById("btn-mas").addEventListener("click", () => {
          input.value = Number(input.value) + 1;
        });
      },
      preConfirm: () => {
        const val = Number(document.getElementById("input-cantidad").value);
        if (!Number.isInteger(val) || val < 1) {
          Swal.showValidationMessage("Ingresa una cantidad válida (mínimo 1).");
          return;
        }
        return val;
      },
    });

    if (cantidad) {
      agregarAlCarrito(prod, Number(cantidad));
      setAgregado(prod.nombre);
      setTimeout(() => setAgregado(null), 2000);
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
                    {agregado === prod.nombre && (
                      <span className="agregado-feedback">✓ Agregado</span>
                    )}
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