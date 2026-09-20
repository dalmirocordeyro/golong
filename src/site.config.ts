// ─────────────────────────────────────────────────────────────
//  Configuración del sitio. Es el único archivo que tenés que
//  tocar para cambiar nombre, dominio, autor y publicidad.
// ─────────────────────────────────────────────────────────────

export const SITE = {
  name: 'golong',
  /** Dominio final (sin https://). Cambialo cuando compres el tuyo. */
  domain: 'golong.com.ar',
  /** URL pública. Mientras no tengas dominio, podés definir SITE_URL (p. ej. https://golong.tu-usuario.workers.dev). */
  get url(): string {
    const env = typeof process !== 'undefined' ? process.env?.SITE_URL : undefined;
    return (env || `https://${this.domain}`).replace(/\/$/, '');
  },
  tagline: 'Dólar hoy, riesgo país y mercados de Argentina',
  description:
    'Cotización del dólar blue, oficial, MEP, CCL, cripto y tarjeta en vivo, brecha cambiaria, riesgo país, inflación, acciones del Merval, bonos, CEDEARs y criptomonedas.',
  locale: 'es-AR',

  author: {
    name: 'Dalmiro Cordeyro',
    /** Perfiles públicos: ayudan a que Google asocie el sitio con vos. */
    sameAs: [
      'https://github.com/dalmirocordeyro',
      // Agregá acá tu LinkedIn u otros perfiles públicos. Poné también
      // el link a este sitio en cada perfil: el vínculo tiene que ir en los dos sentidos.
    ] as string[],
  },

  /** Cuenta de X/Twitter del sitio, sin @ (vacío = no se muestra). */
  x: '',

  /**
   * Google AdSense. Dejalo vacío hasta que te aprueben.
   * client: 'ca-pub-XXXXXXXXXXXXXXXX'
   * Los slots son los IDs de cada bloque de anuncio que creás en AdSense.
   */
  adsense: {
    client: '',
    slots: {
      top: '',
      inline: '',
      footer: '',
    },
  },

  /** Cloudflare Web Analytics (gratis, sin cookies). Token del sitio. */
  cloudflareAnalyticsToken: '',
} as const;

export type SiteConfig = typeof SITE;
