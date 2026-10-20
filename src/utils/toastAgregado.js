import Swal from "sweetalert2";

// Toast compacto con el mismo SweetAlert2 de la confirmación de compra:
// sale arriba con el cuadrito del producto, se cierra solo a los 3
// segundos (con barra de progreso) o a mano con la X. Reemplaza al
// "✓ Agregado" chiquito de la tarjeta, que se perdía.
export const toastAgregado = (nombreProducto, imagenUrl) => {
  Swal.fire({
    toast: true,
    position: "top",
    icon: "success",
    title: `<span class="toast-carrito-nombre">${nombreProducto}</span> agregado al carrito`,
    html: `<img src="/img/${imagenUrl || "alfajor.jpg"}" alt="" class="toast-carrito-img" onerror="this.onerror=null;this.src='/img/alfajor.jpg'" />`,
    showConfirmButton: false,
    showCloseButton: true,
    timer: 3000,
    timerProgressBar: true,
    customClass: { popup: "toast-carrito" },
  });
};

export default toastAgregado;
