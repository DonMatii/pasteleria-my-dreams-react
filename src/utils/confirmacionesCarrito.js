import Swal from "sweetalert2";

// Confirmaciones del carrito, centralizadas en un solo lugar para que el
// mini carrito (/) y la vista de pedido (/pedido) compartan exactamente el
// mismo estilo: antes cada vista armaba su propio alert y divergieron.

// Colores institucionales de la marca (mismos que usan los botones del sitio).
const COLOR_INSTITUCIONAL = "#d95386";
const COLOR_SECUNDARIO = "#b04e6f";

// IMPORTANTE: no usar iconHtml sin pasar icon. El contenedor .swal2-icon
// pinta su borde con currentColor y, sin una clase .swal2-* que lo coloque,
// hereda --swal2-color (#545454) y el círculo sale NEGRO aunque el SVG de
// adentro sea rosa. Con icon + iconColor, SweetAlert2 pinta borde y glifo
// con el color institucional.
export const confirmarQuitarProducto = (nombreProducto, onConfirm) =>
  Swal.fire({
    title: "¿Quitar del carrito?",
    text: `¿Seguro que quieres eliminar ${nombreProducto}?`,
    icon: "question",
    iconColor: COLOR_INSTITUCIONAL,
    showCancelButton: true,
    confirmButtonColor: COLOR_INSTITUCIONAL,
    cancelButtonColor: COLOR_SECUNDARIO,
    confirmButtonText: "Sí, quitar",
    cancelButtonText: "Cancelar",
  }).then((result) => {
    if (result.isConfirmed) {
      onConfirm();
    }
  });

// Cada vista tiene su propia redacción para el mismo aviso; se mantiene
// parametrizado para no cambiar el texto que ya ve el usuario.
export const confirmarVaciarCarrito = ({
  onConfirm,
  texto = "¿Seguro que quieres eliminar todos los productos?",
}) =>
  Swal.fire({
    title: "Vaciar carrito",
    text: texto,
    icon: "warning",
    iconColor: COLOR_INSTITUCIONAL,
    showCancelButton: true,
    confirmButtonColor: COLOR_INSTITUCIONAL,
    cancelButtonColor: COLOR_SECUNDARIO,
    confirmButtonText: "Sí, vaciar",
    cancelButtonText: "Cancelar",
  }).then((result) => {
    if (result.isConfirmed) {
      onConfirm();
      Swal.fire(
        "Carrito vacío",
        "Se eliminaron todos los productos.",
        "info"
      );
    }
  });
