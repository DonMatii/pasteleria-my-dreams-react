import Swal from "sweetalert2";

// Modal compartido (Delicias y Home) para elegir cuantas unidades llevar
// al carrito. Devuelve la cantidad elegida o null si el cliente cancela.
export const pedirCantidad = async (producto) => {
  const { value: cantidad } = await Swal.fire({
    title: producto.nombre,
    html: `
      <p class="swal-texto">¿Cuántos quieres agregar a tu carrito de compras?</p>
      <div class="selector-cantidad">
        <button type="button" class="btn-cantidad" id="btn-menos" aria-label="Restar cantidad">−</button>
        <input type="number" id="input-cantidad" value="1" min="1" readonly />
        <button type="button" class="btn-cantidad" id="btn-mas" aria-label="Sumar cantidad">+</button>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Agregar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#d95386",
    cancelButtonColor: "#b04e6f",
    didOpen: () => {
      const input = document.getElementById("input-cantidad");
      document.getElementById("btn-menos").addEventListener("click", () => {
        const val = Number(input.value);
        if (val > 1) input.value = val - 1;
      });
      document.getElementById("btn-mas").addEventListener("click", () => {
        input.value = Number(input.value) + 1;
      });
    },
    preConfirm: () => {
      const val = Number(document.getElementById("input-cantidad").value);
      if (!Number.isInteger(val) || val < 1) {
        Swal.showValidationMessage("Ingresa una cantidad válida (mínimo 1).");
        return;
      }
      return val;
    },
  });

  return typeof cantidad === "number" ? cantidad : null;
};

export default pedirCantidad;
