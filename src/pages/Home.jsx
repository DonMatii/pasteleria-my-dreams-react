import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';
import '../App.css';
import {
  obtenerCodigoBienvenida,
  consumirCodigoBienvenida,
  verificarElegibilidadBienvenida,
} from "../service/BienvenidaService";
import { obtenerProductos, aplanarCatalogo, obtenerDeliciaDelDia } from "../service/ProductosService";
import { useCarrito } from "../context/CarritoContext";
import { pedirCantidad } from "../utils/pedirCantidad";
import { toastAgregado } from "../utils/toastAgregado";

// Respaldo: si la API no responde, la home muestra estos productos en vez de quedar vacía.
const productosRespaldo = [
  {
    id: 1,
    nombre: 'Kutchen de Manzana',
    descripcion: 'Delicioso kutchen casero con manzanas frescas y un toque de canela.',
    imagenUrl: 'kutchenDeManzana.jpg',
    precio: 5500,
  },
  {
    id: 2,
    nombre: 'Pie de Limón',
    descripcion: 'Nuestra receta clásica con merengue suizo dorado a la perfección.',
    imagenUrl: 'pieDeLimon.jpg',
    precio: 6500,
  },
  {
    id: 3,
    nombre: 'Torta Crema Piña',
    descripcion: 'Bizcocho esponjoso relleno de crema chantilly y trozos de piña natural.',
    imagenUrl: 'tortaCremaPina.jpg',
    precio: 7000,
  },
];

// Mezcla de Fisher-Yates: cada visita muestra una selección distinta del catálogo.
const mezclar = (lista) => {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
};

function Home() {
  // Beneficio de primera conexion: el backend es la autoridad del uso unico
  // por email, así que antes de prometer el código se consulta elegibilidad.
  // codigoBienvenida queda null si el navegador no lo tiene O si el backend
  // dice que ese email ya lo canjeó (ahí también se limpia el localStorage).
  const [codigoBienvenida, setCodigoBienvenida] = useState(null);
  const usuarioConectado = sessionStorage.getItem("userName");
  const usuarioEmail = sessionStorage.getItem("userEmail");
  const { agregarAlCarrito } = useCarrito();

  const [delicia, setDelicia] = useState(null);   // producto destacado del día
  // true cuando la delicia vino del backend (mismo sorteo para todos);
  // false = fallback aleatorio local, sin badge de descuento
  const [deliciaDelDiaReal, setDeliciaDelDiaReal] = useState(false);
  const [favoritos, setFavoritos] = useState([]); // 3 productos distintos de la delicia

  // Confirma con el backend que el codigo de bienvenida siga vigente para este
  // email antes de mostrarlo (feedback de demo: no prometer un código trampa)
  useEffect(() => {
    let vivo = true;
    const confirmarBienvenida = async () => {
      const codigoLocal = obtenerCodigoBienvenida();
      if (!codigoLocal || !usuarioConectado || !usuarioEmail) return;
      let elegible = false;
      try {
        elegible = await verificarElegibilidadBienvenida(usuarioEmail);
      } catch {
        // Sin confirmación del backend no se promete el descuento
        elegible = false;
      }
      if (!vivo) return;
      if (elegible) {
        setCodigoBienvenida(codigoLocal);
      } else {
        // El backend lo rechazaria: se consume el codigo local para que
        // /pedido tampoco lo prellene y el cliente no reciba un código trampa
        consumirCodigoBienvenida();
        setCodigoBienvenida(null);
      }
    };
    confirmarBienvenida();
    return () => {
      vivo = false;
    };
  }, [usuarioConectado, usuarioEmail]);

  useEffect(() => {
    const cargarProductos = async () => {
      let lista = productosRespaldo;
      try {
        const datos = await obtenerProductos();
        const plana = aplanarCatalogo(datos);
        if (plana.length > 0) lista = plana;
      } catch (error) {
        console.error("Error al cargar productos en Home:", error);
      }

      // La delicia del día la decide el backend (misma para todos);
      // si el endpoint falla, caemos al sorteo aleatorio de siempre
      let deliciaDelDia = null;
      try {
        deliciaDelDia = await obtenerDeliciaDelDia();
      } catch (error) {
        console.error("Error al cargar la delicia del día en Home:", error);
      }

      if (deliciaDelDia && deliciaDelDia.nombre) {
        // Con delicia real del backend: los favoritos la excluyen (por id)
        const favoritosSinDelicia = mezclar(
          lista.filter((prod) => prod.id !== deliciaDelDia.id)
        ).slice(0, 3);
        setDelicia(deliciaDelDia);
        setDeliciaDelDiaReal(true);
        setFavoritos(favoritosSinDelicia);
        return;
      }

      // Fallback: sorteo local; sin badge de descuento porque el backend
      // no confirmó la delicia de hoy
      const mezcla = mezclar(lista);
      setDelicia(mezcla[0]);
      setDeliciaDelDiaReal(false);
      setFavoritos(mezcla.slice(1, 4));
    };

    cargarProductos();
  }, []);

  const manejarAgregar = async (prod) => {
    const cantidad = await pedirCantidad(prod);

    if (cantidad) {
      agregarAlCarrito(prod, cantidad);
      toastAgregado(prod.nombre, prod.imagenUrl);
    }
  };

  return (
    <main className="main-content">
      {/* Hero: banner de bienvenida con imagen de fondo del catalogo */}
      <section className="hero">
        <h1 className="titulo-principal">Bienvenido a Pastelería My Dreams</h1>
        <p className="subtitulo-home">
          Somos un emprendimiento familiar que te entrega sabores que iluminan tus sueños.
        </p>
        <Link to="/delicias" className="boton-principal hero-boton">
          Ver nuestras delicias
        </Link>
      </section>

      {/* Premio por conectar: solo con codigo pendiente, sesion activa y elegibilidad confirmada por el backend */}
      {codigoBienvenida && usuarioConectado && (
        <section
          className="banner-bienvenida"
          data-testid="banner-bienvenida"
          style={{
            margin: "0 auto 30px",
            padding: "20px",
            maxWidth: "640px",
            backgroundColor: "#fff5f5",
            border: "2px solid #d63384",
            borderRadius: "15px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>
            🎉 ¡Bienvenido/a, <b>{usuarioConectado}</b>! Por conectar por primera vez,
            tu primer pedido tiene <b>10% de descuento</b>.
          </p>
          <p style={{ margin: "0 0 15px" }}>
            Código: <b data-testid="codigo-bienvenida-home">{codigoBienvenida}</b>
          </p>
          <Link to="/pedido" className="boton-principal" style={{ textDecoration: "none" }}>
            Usar mi descuento
          </Link>
        </section>
      )}

      {/* Delicia del día: producto elegido al azar, con alta directa al carrito */}
      {delicia && (
        <section className="delicia-dia" data-testid="delicia-dia">
          <h2 className="titulo-seccion">Delicia del Día</h2>
          <p className="seccion-subtitulo">
            {deliciaDelDiaReal
              ? "La especialidad de hoy, con un 10% de descuento en tu pedido"
              : "Elegida al azar entre todas nuestras creaciones"}
          </p>

          <div className="delicia-card">
            <div className="delicia-img">
              <img
                src={`/img/${delicia.imagenUrl}`}
                alt={delicia.nombre}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/img/alfajor.jpg";
                }}
              />
            </div>

            <div className="delicia-info">
              {/* Solo el backend confirma el descuento: en fallback no hay badge */}
              {deliciaDelDiaReal && (
                <span className="delicia-badge" data-testid="badge-delicia">
                  -10% hoy
                </span>
              )}
              <h3>{delicia.nombre}</h3>
              <p>{delicia.descripcion}</p>
              <span className="precio-tag">
                ${Number(delicia.precio).toLocaleString("es-CL")}
              </span>
              <button
                type="button"
                className="boton-principal"
                onClick={() => manejarAgregar(delicia)}
              >
                Agregar al carrito
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="productos-favoritos" data-testid="favoritos-casa">
        <h2 className="titulo-seccion">Favoritos de la Casa</h2>
        <p className="seccion-subtitulo">
          Descubre nuestras recetas más populares y sabrosas
        </p>

        <div className="vitrina">
          {favoritos.map((prod) => (
            <div className="producto" key={prod.id}>
              <div className="img-wrapper">
                <img
                  src={`/img/${prod.imagenUrl}`}
                  alt={prod.nombre}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/img/alfajor.jpg";
                  }}
                />
              </div>
              <div className="info">
                <h3>{prod.nombre}</h3>
                <p>{prod.descripcion}</p>
                <span className="precio-tag">
                  ${Number(prod.precio).toLocaleString("es-CL")}
                </span>
                <button
                  type="button"
                  className="boton-principal boton-agregar-tarjeta"
                  onClick={() => manejarAgregar(prod)}
                >
                  Agregar al carrito
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default Home;
