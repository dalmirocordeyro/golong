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
      // 'https://www.linkedin.com/in/tu-usuario',
      // 'https://github.com/tu-usuario',
      // 'https://x.com/tu-usuario',
    ] as string[],
    /** Descripción breve que aparece en /sobre-mi. Editala a gusto. */
    jobTitle: '',
  },

  /** Email de contacto público (vacío = no se muestra). */
  contactEmail: '',
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
