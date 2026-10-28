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
              My Dreams nació del sueño de Cathi: tener su propia pastelería. Por algo
              el nombre significa “mis sueños”: hoy ese sueño se hizo realidad, y sale
              de nuestra casa.
            </p>
          </article>

          <article className="historia-card">
            <span className="historia-icono" aria-hidden="true">👩‍🍳</span>
            <h3>La cocina</h3>
            <p>
              <strong>Andrés</strong> es quien hornea. Con lo que aprendió estudiando
              gastronomía y con recetas propias, cada pedido se prepara a mano en la
              cocina de la casa — recién hecho para vos, como si fueras de la familia.
            </p>
          </article>

          <article className="historia-card">
            <span className="historia-icono" aria-hidden="true">💻</span>
            <h3>Detrás de la web</h3>
            <p>
              Cathi y Matías pusieron esta página y se encargan de los pedidos: la
              tecnología al servicio del sueño de la casa.
            </p>
          </article>
        </div>
      </Revelar>
    </main>
  );
}

export default Historia;
