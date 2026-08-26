Markdown
# 🧁 Pastelería My Dreams — Fullstack Web App

¡Bienvenido a la versión final de **Pastelería My Dreams**! 🚀
Este proyecto ha evolucionado de un sitio estático a una aplicación **Fullstack** robusta y modular. Se reconstruyó como una **Single Page Application (SPA)** con React, conectada a una **arquitectura distribuida de microservicios** en Java Spring Boot y respaldada por una base de datos relacional (MySQL/XAMPP).

---

## ✨ Logros de esta Entrega Final

* **Arquitectura de Microservicios en la Nube:** Conexión en tiempo real con microservicios independientes en Java Spring Boot desplegados en AWS EC2, orquestados mediante **AWS API Gateway** con enrutamiento de proxy y gestión completa de CORS.
* **Admin Panel Pro:** Panel de administración protegido para gestionar el inventario del catálogo (CRUD completo: Crear, Leer, Actualizar, Borrar) y visualizar métricas operativas del sistema en vivo.
* **Autenticación Segura (IDaaS):** Implementación de Google OAuth 2.0 para la autenticación de clientes y acceso seguro, combinada con credenciales de administrador para la gestión del panel.
* **Persistencia de Datos en AWS RDS:** Gestión de productos vinculada a una base de datos relacional alojada en la nube mediante Spring Data JPA e Hibernate, permitiendo sincronización inmediata.
* **Contacto Funcional:** Integración con el servicio **Formspree** para la recepción de mensajes reales, garantizando una comunicación efectiva con el cliente.
* **Calidad de Software:** Implementación de pruebas unitarias con **Vitest** y reporte de cobertura de código.

---

## 🛠️ Stack Tecnológico

### **Frontend**
* ⚛️ **React 19 + Vite 7** (Arquitectura moderna y rápida)
* 🌐 **React Router 7** (Gestión de rutas dinámicas)
* 📡 **Axios** (Cliente HTTP para el consumo del backend a través de **AWS API Gateway**)
* 🧪 **Vitest + React Testing Library** (Garantía de calidad y pruebas unitarias)
* 🔐 **@react-oauth/google** (Integración con Google Identity Services)
* ☁️ **AWS (Amazon Web Services):** Despliegue distribuido utilizando **S3** (Hosting del Frontend), **EC2** (Hosting de microservicios Java) y **API Gateway** (Enrutamiento centralizado).

### **Backend & DevOps**
* ☕ Java 21 (Lenguaje base del ecosistema)
* 🍃 **Spring Boot** (Lógica de negocio y microservicios desacoplados)
* 🗄️ **AWS RDS (MySQL) & Hibernate JPA** (Gestión de base de datos relacional en la nube y ORM)
* 🛡️ Spring Security (Gestión de seguridad y filtros de autorización)
* 🏗️ Maven (Gestión de dependencias)
* 📧 **Formspree** (Servicio externo de mensajería)

---

## 💻 Instalación y Ejecución

Para levantar el proyecto localmente, sigue estos pasos:

```bash
# 1. Clonar el repositorio
git clone [https://github.com/CatherineGodoy/pasteleria-my-dreams-react.git](https://github.com/CatherineGodoy/pasteleria-my-dreams-react.git)
```

```bash
# 2. Entrar a la carpeta del proyecto
cd pasteleria-my-dreams-react
```

```bash
# 3. Instalar todas las dependencias
npm install
```

```bash
# 4. Iniciar el servidor de desarrollo
npm run dev
```

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
```

```bash
# Generar reporte de cobertura detallado (%)
npx vitest run --coverage
```

```bash
# Abrir el dashboard gráfico de Vitest en el navegador
npx vitest --ui
```

## 🔄 Evolución del Proyecto (Hitos)
Fase 1: Maquetación inicial (HTML/CSS/JS Estático).

Fase 2: Migración a React y creación de componentes reutilizables.

Fase 3: Implementación de Pruebas Unitarias y validaciones de usuario.

Fase 4 (Meta Alcanzada): Integración total con Backend (Spring Boot), seguridad dual y despliegue exitoso en infraestructura Cloud (AWS S3, EC2, API Gateway y RDS) operando al 100%.

## 👩‍💻 Autor
Desarrollado con ❤️ por **Catherine Godoy** | 🔗 [Visita mi Perfil de GitHub](https://github.com/CatherineGodoy)