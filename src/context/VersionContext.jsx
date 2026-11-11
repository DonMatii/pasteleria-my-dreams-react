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
  // Se leen en cada render para que un login en caliente (SPA, sin recargar)
  // cambie las dependencias del efecto y se consulte la versión del usuario
  // nuevo: si no, el provider se quedaría con el valor anterior.
  const esAdmin = sessionStorage.getItem("userRole") === "admin";
  const email = sessionStorage.getItem("userEmail");

  useEffect(() => {
    if (esAdmin) {
      setVersion(3);
      setCargandoVersion(false);
      return;
    }
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
    setCargandoVersion(true);
    let consultaViva = true;
    apiClient
      .get("/api/usuarios/version", { params: { email } })
      .then((respuesta) => {
        if (consultaViva) setVersion(Number(respuesta.data?.version) || 0);
      })
      .catch(() => {
        if (consultaViva) setVersion(0);
      })
      .finally(() => {
        if (consultaViva) setCargandoVersion(false);
      });
    return () => {
      consultaViva = false;
    };
  }, [esAdmin, email]);

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
