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
            <h3>El origen de un sueño</h3>
            <p>
              Todo comenzó con un nombre: My Dreams, que significa «Mis Sueños». Nació
              de la ilusión de Catherine por tener una pastelería familiar, un lugar
              donde los pequeños detalles y el cariño hicieran la diferencia. Lo que
              empezó como un sueño hoy tiene nombre, identidad y una historia que
              queremos compartir contigo.
            </p>
          </article>

          <article className="historia-card">
            <span className="historia-icono" aria-hidden="true">🧁</span>
            <h3>El sabor de lo hecho en casa</h3>
            <p>
              Andrés es el corazón de nuestra cocina. Con su pasión por la gastronomía,
              da vida a nuestras preparaciones, combinando creatividad, dedicación y
              ese toque especial de lo hecho en casa. Porque para nosotros, la pastelería
              no se trata solo de sabores, sino también de crear momentos para disfrutar
              y compartir.
            </p>
          </article>

          <article className="historia-card">
            <span className="historia-icono" aria-hidden="true">💻</span>
            <h3>Detrás de nuestra web</h3>
            <p>
              Catherine y Matías estamos detrás de la experiencia digital de My Dreams.
              Unimos nuestra creatividad y conocimientos en tecnología para diseñar este
              espacio, donde puedes descubrir nuestras delicias y realizar tus pedidos
              de manera fácil y cercana. Una forma de llevar nuestro sueño desde nuestra
              familia hasta tu hogar.
            </p>
          </article>
        </div>
      </Revelar>
    </main>
  );
}

export default Historia;
