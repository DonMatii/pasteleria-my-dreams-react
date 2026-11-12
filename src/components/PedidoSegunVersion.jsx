import { useVersion } from "../context/VersionContext";
import Pedido from "../pages/Pedido";
import Solicitud from "../pages/Solicitud";

// /pedido según la versión del usuario (demo de las tres versiones): la V1 solo
// tiene el formulario de solicitud de pedido (S2: sin carrito ni compra); desde
// la V2 se ve el checkout de siempre.
const PedidoSegunVersion = () => {
  const { tieneVersion } = useVersion();
  return tieneVersion(2) ? <Pedido /> : <Solicitud />;
};

export default PedidoSegunVersion;
