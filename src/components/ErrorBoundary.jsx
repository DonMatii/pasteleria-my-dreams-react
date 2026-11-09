import { Component } from "react";

/**
 * Error Boundary: si un componente hijo crashea, muestra un fallback
 * amigable en vez de dejar la pantalla en blanco. Puramente aditivo:
 * no cambia el comportamiento normal, solo captura errores no manejados.
 *
 * El fallback reutiliza la clase fondo-pagina (la misma foto de fondo del
 * resto del sitio) y la paleta institucional para que un error se vea
 * como parte de My Dreams y no como una pantalla rota.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary capturó:", error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary fondo-pagina" role="alert">
          <div className="error-boundary-tarjeta">
            <span className="error-boundary-icono" aria-hidden="true">
              🎂
            </span>
            <h2 className="error-boundary-titulo">Ups, algo se nos quemó en el horno</h2>
            <p className="error-boundary-texto">
              Ocurrió un error inesperado y no pudimos mostrar esta página, pero
              no te preocupes: ¡los pasteles están bien! Prueba de nuevo o
              actualiza la página; si el problema continúa, intenta en un rato más.
            </p>
            <button type="button" className="error-boundary-boton" onClick={this.handleRetry}>
              Volver a intentarlo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;