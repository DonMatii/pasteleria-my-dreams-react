import React, { useState } from "react";
import '../App.css'; 
import Swal from 'sweetalert2';

const Contacto = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    asunto: "",
    mensaje: "",
  });

  const [errores, setErrores] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    if (id === "telefono") {
      const soloNumeros = value.replace(/\D/g, ""); 
      setFormData({ ...formData, [id]: soloNumeros });
    } else {
      setFormData({ ...formData, [id]: value });
    }
    if (errores[id]) setErrores({ ...errores, [id]: "" });
  };

  const validarFormulario = () => {
    let nuevosErrores = {};
    let esValido = true;
    const patronNombre = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    const patronEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.nombre.trim()) {
      nuevosErrores.nombre = "Por favor, ingresa tu nombre.";
      esValido = false;
    } else if (!patronNombre.test(formData.nombre)) {
      nuevosErrores.nombre = "El nombre no debe contener números ni símbolos.";
      esValido = false;
    }

    if (!formData.email.trim() || !patronEmail.test(formData.email)) {
      nuevosErrores.email = "Ingresa un correo electrónico válido.";
      esValido = false;
    }

    if (formData.telefono.length !== 8) {
      nuevosErrores.telefono = "El teléfono debe tener 8 dígitos.";
      esValido = false;
    }

    if (!formData.asunto) {
      nuevosErrores.asunto = "Selecciona un motivo.";
      esValido = false;
    }

    if (formData.mensaje.trim().length < 20) {
      nuevosErrores.mensaje = "Tu mensaje debe tener al menos 20 caracteres.";
      esValido = false;
    }

    setErrores(nuevosErrores);
    return esValido;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) {
        Swal.fire({
            icon: 'warning',
            title: 'Formulario incompleto',
            text: 'Por favor, revisa los campos marcados para continuar.',
            confirmButtonColor: '#d95386'
        });
        return;
    }

    setLoading(true);

    try {
      const response = await fetch("https://formspree.io/f/mlgjkovz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        Swal.fire({
            icon: 'success',
            title: '¡Mensaje enviado!',
            text: 'Gracias por escribirnos, te contactaremos pronto. 🧁',
            confirmButtonColor: '#d95386'
        });
        setFormData({ nombre: "", email: "", telefono: "", asunto: "", mensaje: "" });
      } else {
        Swal.fire("Error", "No se pudo enviar el mensaje.", "error");
      }
    } catch (error) {
      Swal.fire("Error", "Error de conexión.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="main-content">
      <h1 className="titulo-principal">¡Contáctanos!</h1>
      <p className="subtitulo-home">Tu opinión es nuestro ingrediente secreto.</p>

      <div className="formulario-container">
        <form onSubmit={handleSubmit} noValidate>
          
          <div className="form-group">
            <label htmlFor="nombre">Nombre Completo:</label>
            <input 
              type="text" 
              id="nombre" 
              value={formData.nombre} 
              onChange={handleChange} 
              className={errores.nombre ? "input-error" : ""} 
              placeholder="Ej: María Pérez"
            />
            {errores.nombre && <span className="error-text">{errores.nombre}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Correo Electrónico:</label>
            <input 
              type="email" 
              id="email" 
              value={formData.email} 
              onChange={handleChange} 
              className={errores.email ? "input-error" : ""} 
              placeholder="maria@correo.com"
            />
            {errores.email && <span className="error-text">{errores.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="telefono">Teléfono (+56 9):</label>
            <input 
              type="tel" 
              id="telefono" 
              value={formData.telefono} 
              onChange={handleChange} 
              maxLength="8" 
              className={errores.telefono ? "input-error" : ""} 
              placeholder="12345678"
            />
            {errores.telefono && <span className="error-text">{errores.telefono}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="asunto">Motivo del mensaje:</label>
            <select 
              id="asunto" 
              value={formData.asunto} 
              onChange={handleChange} 
              className={errores.asunto ? "input-error" : ""}
            >
              <option value="">Selecciona una opción...</option>
              <option value="consulta">Consulta general</option>
              <option value="felicitacion">Felicitaciones</option>
              <option value="reclamo">Reclamo</option>
            </select>
            {errores.asunto && <span className="error-text">{errores.asunto}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="mensaje">Tu Mensaje:</label>
            <textarea 
              id="mensaje" 
              rows="5" 
              value={formData.mensaje} 
              onChange={handleChange} 
              className={errores.mensaje ? "input-error" : ""} 
              placeholder="Escribe aquí..."
            ></textarea>
            <div className="form-footer-info">
              <small className={`char-count ${formData.mensaje.length > 450 ? 'limit-near' : ''}`}>
                {500 - formData.mensaje.length} caracteres restantes
              </small>
            </div>
            {errores.mensaje && <span className="error-text">{errores.mensaje}</span>}
          </div>

          <button type="submit" className="boton-principal" disabled={loading}>
            {loading ? "Enviando..." : "Enviar mensaje"}
          </button>
        </form>
      </div>
    </main>
  );
};

export default Contacto;