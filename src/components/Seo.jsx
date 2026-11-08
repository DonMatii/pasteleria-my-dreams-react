import { useEffect } from "react";

const SITE_NAME = "Pastelería My Dreams";
const SITE_URL = "https://pasteleriamydreams.cl"; // actualizar al deploy final
const DEFAULT_IMAGE = `${SITE_URL}/img/logoPasteleria.png`;

/**
 * SEO por ruta. Actualiza <title>, meta description, Open Graph y Twitter Card
 * en el <head> cuando cambia de página. Es puramente aditivo: no afecta
 * lógica ni tests.
 */
function Seo({ title, description, path = "/", image = DEFAULT_IMAGE, noindex = false }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Tortas Artesanales`;
  const url = `${SITE_URL}${path}`;
  const desc = description || "Pastelería artesanal en Chile. Tortas personalizadas, dulces y sueños horneados con amor. ¡Haz tu pedido online!";

  useEffect(() => {
    document.title = fullTitle;

    const setMeta = (name, content, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", desc);
    setMeta("robots", noindex ? "noindex, nofollow" : "index, follow");

    // Open Graph
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", desc, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:url", url, "property");
    setMeta("og:image", image, "property");
    setMeta("og:site_name", SITE_NAME, "property");
    setMeta("og:locale", "es_CL", "property");

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", desc);
    setMeta("twitter:image", image);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);
  }, [fullTitle, desc, url, image, noindex]);

  return null;
}

export default Seo;