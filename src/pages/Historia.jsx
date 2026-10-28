import Revelar from "../components/Revelar";
import "../App.css";
import "./Historia.css";

// Página propia de la historia del negocio (antes era una sección del Home).
// El copy público es contrato: nombres reales sí, escuelas del curso no
// (está fijado por test en tests/Historia.spec.jsx).
function Historia() {
  return (
    <main className="main-content">
      <Revelar as="section" className="nuestra-historia" data-testid="nuestra-historia">
        <h1 className="titulo-seccion">Nuestra historia</h1>
        <p className="seccion-subtitulo">Sueños que se hornean en casa</p>

        <div className="historia-grilla">
          <article className="historia-card">
            <span className="historia-icono" aria-hidden="true">🌙</span>
            <h3>El nombre</h3>
            <p>
              Todo arrancó con un nombre. <strong>My Dreams</strong> —“mis sueños”— lo
              pensó Cathi cuando imaginaba su propia pastelería. Hoy ese nombre está
              escrito en cada pastel que sale de nuestra cocina.
            </p>
          </article>

          <article className="historia-card">
            <span className="historia-icono" aria-hidden="true">👩‍🍳</span>
            <h3>La cocina</h3>
            <p>
              <strong>Andrés</strong>, nuestro pastelero, se formó en gastronomía y
              convirtió la cocina de la casa en un obrador. Cabajo pedido se hornea aquí,
              con recetas propias y hechas a mano: nada sale de una fábrica.
            </p>
          </article>

          <article className="historia-card">
            <span className="historia-icono" aria-hidden="true">💻</span>
            <h3>Detrás de la web</h3>
            <p>
              Cathi y Matías pusieron la tecnología: la web, los pedidos y todo lo que
              hace que esto funcione. Hornear y programar, con el mismo cariño.
            </p>
          </article>
        </div>
      </Revelar>
    </main>
  );
}

export default Historia;
