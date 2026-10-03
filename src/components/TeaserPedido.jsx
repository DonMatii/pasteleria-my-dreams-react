import { Link } from "react-router-dom";
import { esPrimeraConexion } from "../service/BienvenidaService";
import "../App.css";

// Invitado en /pedido: en vez de dejarlo pedir a ciegas (catálogo cerrado pero
// caja abierta), mostramos la razon para conectar. Si nunca inicio sesion le
// prometemos el -10%; si ya conecto antes, solo le pedimos que vuelva a entrar
// (el mensaje nunca promete un descuento que ya no le corresponde).
const TeaserPedido = () => {
  const primera = esPrimeraConexion();

  return (
    <main className="main-content">
      <div
        className="formulario-container"
        data-testid="teaser-pedido"
        style={{ textAlign: "center" }}
      >
        <h1 className="titulo-principal">¡Haz tu pedido!</h1>
        <p className="subtitulo-home">
          {primera
            ? "Inicia sesión para descubrir tus delicias y pedir al instante."
            : "Inicia sesión para ver las delicias y continuar con tu pedido."}
        </p>

        {primera && (
          <p data-testid="teaser-descuento" style={{ fontWeight: "bold" }}>
            ¿Primera vez aquí? Tu primer pedido tiene un{" "}
            <strong>10% de descuento</strong> con tu código de bienvenida.
          </p>
        )}

        <Link
          to="/login?redirect=/pedido"
          className="boton-principal"
          data-testid="teaser-cta"
          style={{ display: "inline-block", textDecoration: "none" }}
        >
          {primera ? "Iniciar sesión y obtener mi 10%" : "Iniciar sesión"}
        </Link>
      </div>
    </main>
  );
};

export default TeaserPedido;
