import { useEffect, useState } from "react";

// Aparece recien cuando el usuario baja un tramo, para no estorbar arriba.
const UMBRAL_VISIBLE = 300;

// Boton flotante que devuelve al inicio de la pagina sin tener que
// arrastrar el scroll ni buscar la barra del navegador.
function BotonVolverArriba() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const alDesplazar = () => setVisible(window.scrollY > UMBRAL_VISIBLE);

    alDesplazar();
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => window.removeEventListener("scroll", alDesplazar);
  }, []);

  const volverAlInicio = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      className="volver-arriba"
      onClick={volverAlInicio}
      aria-label="Volver arriba"
      data-testid="volver-arriba"
      tabIndex={visible ? 0 : -1}
      style={{
        opacity: visible ? 1 : 0,
        visibility: visible ? "visible" : "hidden",
        transform: visible ? "translateY(0)" : "translateY(15px)",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
    </button>
  );
}

export default BotonVolverArriba;
