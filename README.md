# 🧁 Pastelería My Dreams — Fullstack Web App

¡Bienvenido a la versión final de **Pastelería My Dreams**! 🚀
Este proyecto ha evolucionado de un sitio estático a una aplicación **Fullstack** robusta. Se reconstruyó como una **Single Page Application (SPA)** con React, conectada a un backend profesional en Java Spring Boot.

---

## ✨ Logros de esta Entrega Final

* **Integración Fullstack:** Conexión en tiempo real con una API REST hospedada en **Render**.
* **Admin Panel Pro:** Panel de administración protegido para gestionar el catálogo (CRUD completo: Crear, Leer, Actualizar, Borrar).
* **Autenticación Segura (IDaaS):** Implementación de Google OAuth 2.0 para la autenticación de usuarios, eliminando formularios de login tradicionales para clientes y garantizando una gestión de identidad robusta.
* **Persistencia de Datos:** Gestión de productos vinculada a una base de datos dinámica, permitiendo actualizaciones de stock y precios en vivo.
* **Contacto Funcional:** Integración con el servicio **Formspree** para la recepción de mensajes reales, garantizando una comunicación efectiva con el cliente.
* **Calidad de Software:** Implementación de pruebas unitarias con **Vitest** y reporte de cobertura de código.

---

## 🛠️ Stack Tecnológico

### **Frontend**
* ⚛️ **React 19 + Vite 7** (Arquitectura moderna y rápida)
* 🌐 **React Router 7** (Gestión de rutas dinámicas)
* 📡 **Axios** (Cliente HTTP para consumo de API REST)  <-- ¡AQUÍ!
* 🧪 **Vitest + React Testing Library** (Garantía de calidad)
* 🔐 **@react-oauth/google** (Integración con Google Identity Services)

### **Backend & DevOps**
* 🍃 **Spring Boot** (Lógica de negocio y API REST)
* ☁️ **Render** (Despliegue y Hosting de la infraestructura)
* 🔑 **JWT** (Gestión de seguridad y sesiones)
* 📧 **Formspree** (Servicio externo de mensajería)

---

## 💻 Instalación y Ejecución

Para levantar el proyecto localmente, sigue estos pasos:

```bash
# 1. Clonar el repositorio
git clone [https://github.com/CatherineGodoy/pasteleria-my-dreams-react.git](https://github.com/CatherineGodoy/pasteleria-my-dreams-react.git)

# 2. Entrar a la carpeta del proyecto
cd pasteleria-my-dreams-react

# 3. Instalar todas las dependencias
npm install

# 4. Iniciar el servidor de desarrollo
npm run dev


## 🧪 Testing y Calidad

Para garantizar la robustez de la aplicación y una experiencia de usuario sin errores, se ha implementado una estrategia de pruebas unitarias utilizando **Vitest** y **React Testing Library**. 

### **Alcance de las Pruebas:**
* **Validación de Formularios:** Verificación de reglas de negocio en el formulario de contacto (campos obligatorios, formato de email y contador de caracteres).
* **Gestión de Inventario (CRUD):** Pruebas detalladas en el **Admin Panel** para asegurar el flujo de creación, lectura, eliminación y la **lógica de edición flexible** (donde la actualización de imagen es opcional).
* **Seguridad y Acceso:** Verificación del comportamiento de los componentes ante la presencia o ausencia de tokens de autenticación.
* **Reporte de Cobertura (Coverage):** Seguimiento del porcentaje de código probado, asegurando que las funciones críticas tengan una cobertura superior al 90%.

### **Comandos de Ejecución:**

```bash
# Ejecutar la suite de pruebas completa
npx vitest run

# Generar reporte de cobertura detallado (%)
npx vitest run --coverage

# Abrir el dashboard gráfico de Vitest en el navegador
npx vitest --ui


🔄 Evolución del Proyecto (Hitos)
Fase 1: Maquetación inicial (HTML/CSS/JS Estático).

Fase 2: Migración a React y creación de componentes reutilizables.

Fase 3: Implementación de Pruebas Unitarias y validaciones de usuario.

Fase 4 (Meta): Integración con Backend (Spring Boot), implementación de seguridad con Google OAuth 2.0 (IDaaS) y despliegue final.

👩‍💻 Autor
Desarrollado con ❤️ por **Catherine Godoy** | 🔗 [Visita mi Perfil de GitHub](https://github.com/CatherineGodoy)