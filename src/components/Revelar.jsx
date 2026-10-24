import { useEffect, useRef, useState } from "react";
import "./Revelar.css";

// Fallback seguro: la animacion SOLO se arma si el navegador puede ejecutarla.
// Sin IntersectionObserver, con prefers-reduced-motion, o en entornos sin
// window (tests/SSR), el contenido se renderiza visible de entrada y la
// pagina queda exactamente como estaria sin animacion.
const puedeAnimar = () => {
  if (typeof window === "undefined") return false;
  if (typeof window.IntersectionObserver !== "function") return false;
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return false;
    }
  } catch {
    return false; // matchMedia inutilizable: ante la duda, sin animacion
  }
  return true;
};

/**
 * Envuelve un elemento haciendolo aparecer con fade + slide al entrar en pantalla.
 *
 * - `as` define el tag real (section, h1, div...): el DOM no cambia de
 *   estructura, solo se agregan las clases de animacion.
 * - Si el observer nunca dispara, un respaldo por tiempo lo revela igual:
 *   el contenido NUNCA puede quedarse invisible.
 */
function Revelar({ as: Etiqueta = "div", className = "", children, ...props }) {
  const ref = useRef(null);
  // Evaluado en el primer render: decide la clase ANTES del primer pintado,
  // asi no hay flash de contenido visible -> oculto -> animado.
  const [soporta] = useState(puedeAnimar);
  const [revelado, setRevelado] = useState(false);

  useEffect(() => {
    if (!soporta) return;

    const el = ref.current;
    if (!el || typeof window.IntersectionObserver !== "function") return;

    const observer = new window.IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          setRevelado(true);
          observer.disconnect();
        }
      },
      // threshold 0 + margen negativo: basta con que la seccion pise la
      // pantalla (secciones altas nunca llegarian a 15% de su area)
      { threshold: 0, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);

    // Respaldo: si el observer no llega a disparar, el contenido se revela igual
    const respaldo = setTimeout(() => setRevelado(true), 2000);

    return () => {
      clearTimeout(respaldo);
      observer.disconnect();
    };
  }, [soporta]);

  // Sin soporte -> ni "revelar" ni "revelar-activo": HTML limpio y visible.
  const clases = [
    className,
    soporta && !revelado ? "revelar" : "",
    soporta && revelado ? "revelar-activo" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Etiqueta ref={ref} className={clases || undefined} {...props}>
      {children}
    </Etiqueta>
  );
}

export default Revelar;
