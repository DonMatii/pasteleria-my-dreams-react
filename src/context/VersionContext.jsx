import { createContext, useContext, useEffect, useState } from "react";
import apiClient from "../service/apiClient";

// Versión habilitada por usuario (demo de las tres versiones): 1 = solo V1
// (OAuth + solicitud), 2 = V1 + V2 (carrito, compra, seguimiento), 3 = V1+V2+V3
// (actualizaciones de estado). El provider consulta la versión al montar con el
// email del login de Google. El valor por defecto del contexto es "todo
// habilitado": sin provider (las pruebas) nada se rompe; en la app el provider
// siempre está y el valor real llega en milisegundos.
const VersionContext = createContext({
  version: 3,
  esAdmin: false,
  cargandoVersion: false,
  tieneVersion: () => true,
});

export const VersionProvider = ({ children }) => {
  const [version, setVersion] = useState(0);
  const [cargandoVersion, setCargandoVersion] = useState(true);
  const esAdmin = sessionStorage.getItem("userRole") === "admin";

  useEffect(() => {
    if (esAdmin) {
      setVersion(3);
      setCargandoVersion(false);
      return;
    }
    const email = sessionStorage.getItem("userEmail");
    if (!email) {
      // Sin email conocido (invitado o sesión previa al sistema de versiones)
      // se conserva el acceso completo: la versión solo limita a usuarios
      // identificados. Con email, la versión manda y si no se puede verificar
      // se deniega (fail-closed): sin permisos verificados no hay funciones
      // premium.
      setVersion(3);
      setCargandoVersion(false);
      return;
    }
    apiClient
      .get("/api/usuarios/version", { params: { email } })
      .then((respuesta) => setVersion(Number(respuesta.data?.version) || 0))
      .catch(() => setVersion(0))
      .finally(() => setCargandoVersion(false));
  }, [esAdmin]);

  const tieneVersion = (minima) => esAdmin || version >= minima;

  return (
    <VersionContext.Provider
      value={{ version, esAdmin, cargandoVersion, tieneVersion }}
    >
      {children}
    </VersionContext.Provider>
  );
};

export const useVersion = () => useContext(VersionContext);
