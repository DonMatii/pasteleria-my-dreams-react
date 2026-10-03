import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';    
import '../App.css';   
import { obtenerCodigoBienvenida } from "../service/BienvenidaService";

function Home() {
  // Beneficio de primera conexion: visible mientras el codigo siga sin canjear
  const [codigoBienvenida] = useState(() => obtenerCodigoBienvenida());
  const usuarioConectado = sessionStorage.getItem("userName");

  const productosDestacados = [
    { 
      id: 1, 
      nombre: 'Kutchen de Manzana', 
      descripcion: 'Delicioso kutchen casero con manzanas frescas y un toque de canela.', 
      imagen: 'kutchenDeManzana.jpg', 
      precio: '$5.500' 
    },
    { 
      id: 2, 
      nombre: 'Pie de Limón', 
      descripcion: 'Nuestra receta clásica con merengue suizo dorado a la perfección.', 
      imagen: 'pieDeLimon.jpg', 
      precio: '$6.500' 
    },
    { 
      id: 3, 
      nombre: 'Torta Crema Piña', 
      descripcion: 'Bizcocho esponjoso relleno de crema chantilly y trozos de piña natural.', 
      imagen: 'tortaCremaPina.jpg', 
      precio: '$7.000' 
    }
  ];

  return (
    <main className="main-content">
      {/* Hero: Clase específica para el banner de bienvenida */}
      <section className="hero">
        <h1 className="titulo-principal">Bienvenido a Pastelería My Dreams</h1>
        <p className="subtitulo-home">
          Somos un emprendimiento familiar que te entrega sabores que iluminan tus sueños.
        </p>
      </section>

      {/* Premio por conectar: solo con codigo pendiente y sesion activa */}
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

      <section className="productos-favoritos">
        <h2 className="titulo-seccion">Favoritos de la Casa</h2>
        <p className="seccion-subtitulo">
          Descubre nuestras recetas más populares y sabrosas
        </p>

        <div className="vitrina">
          {productosDestacados.map((prod) => (
            <div className="producto" key={prod.id}>
              <div className="img-wrapper">
                {/* Cargamos desde la carpeta public/img/ */}
                <img 
                  src={`/img/${prod.imagen}`} 
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
                <span className="precio-tag">{prod.precio}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Botón de navegación al catálogo */}
        <div className="btn-container-home">
          <Link to="/delicias" className="boton-principal">
            Ver Catálogo Completo
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Home;