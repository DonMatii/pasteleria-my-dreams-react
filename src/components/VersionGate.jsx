import { useVersion } from "../context/VersionContext";

// Compuerta de versión: si la función no está habilitada para el usuario, se
// dice CLARAMENTE en vez de fallar en silencio. En la demo esto es oro: el
// profe ve que los permisos existen porque también ve el rechazo educado.
const VersionGate = ({ minima, children }) => {
  const { tieneVersion, cargandoVersion } = useVersion();

  if (cargandoVersion) {
    return (
      <main className="main-content fondo-pagina">
        <div className="admin-seccion-gestion">
          <p className="admin-meta-vacia">Verificando tu versión…</p>
        </div>
      </main>
    );
  }

  if (!tieneVersion(minima)) {
    return (
      <main className="main-content fondo-pagina">
        <div className="admin-seccion-gestion version-denegada">
          <h2 className="admin-form-titulo">Esta función no está en tu versión</h2>
          <p className="admin-meta-vacia">
            Tu cuenta tiene habilitada la Versión {minima - 1 === 0 ? "1" : "hasta la " + (minima - 1)} y
            esta función pertenece a una versión posterior. Así es como crece
            Pastelería My Dreams: cada versión suma sobre la anterior.
          </p>
        </div>
      </main>
    );
  }

  return children;
};

export default VersionGate;
