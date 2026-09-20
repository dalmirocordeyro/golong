# golong

**Dólar hoy, riesgo país y mercados de Argentina.** Un sitio rápido, sin ventanas emergentes, que se actualiza solo y cuesta US$0 de hosting.

Hecho por Dalmiro Cordeyro.

---

## Qué tiene

| Sección | Qué muestra | Fuente |
|---|---|---|
| Inicio | Blue y oficial en grande, brecha, todos los dólares, gráfico, riesgo país, inflación, mercados | todas |
| `/dolar/*` | 7 páginas (blue, oficial, MEP, CCL, cripto, tarjeta, mayorista) con historial, calculadora, comparación y FAQ | DolarApi + ArgentinaDatos |
| `/brecha` | Brecha contra el oficial con historial | calculada |
| `/riesgo-pais` | EMBI con historial desde 1999 | ArgentinaDatos |
| `/inflacion` | Mensual, interanual, acumulada, gráficos y tabla | ArgentinaDatos (INDEC) |
| `/acciones`, `/bonos`, `/cedears`, `/adrs` | Acciones (panel líder y general), bonos (con MEP implícito), CEDEARs, ADRs | data912 |
| `/cripto` | Top 10 en dólares y en pesos | CoinGecko |
| `/herramientas/*` | Conversor y calculadora de plazo fijo vs. dólar e inflación | varias |
| `/sobre-mi`, `/fuentes`, `/contacto`, `/privacidad`, `/terminos` | Páginas que pide AdSense y que ayudan a que Google te asocie con el sitio | — |

**Cómo se mantiene actualizado**

1. GitHub Actions regenera el sitio cada 15 minutos en horario de mercado (y cada 1 o 2 horas el resto del tiempo) y lo publica en Cloudflare.
2. Mientras alguien tiene la página abierta, su navegador consulta el dólar cada minuto y las cripto cada 2 minutos, directo a las APIs públicas (no consume nada de tu hosting).
3. Si una API se cae durante un build, se reutiliza esa parte del último snapshot publicado (`/data/snapshot.json`) y el sitio sigue funcionando. En `/fuentes` se ve el estado de cada fuente.

**Stack:** [Astro](https://astro.build) (sitio estático), CSS propio, gráficos SVG sin librerías, TypeScript. Cero dependencias en el navegador.

---

## Publicarlo (paso a paso, ~30 minutos)

### 1. Cuentas que necesitás (todas gratis)

- **GitHub**: https://github.com/signup
- **Cloudflare**: https://dash.cloudflare.com/sign-up

### 2. Subir el código a GitHub

1. En GitHub: **New repository** → nombre `golong` → **Public** (recomendado: los minutos de GitHub Actions son ilimitados en repos públicos, y además suma a tu perfil) → **Create**.
2. En tu compu, dentro de la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Primera versión de golong"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/golong.git
git push -u origin main
```

> Si preferís no usar la terminal, podés instalar **GitHub Desktop** y arrastrar la carpeta.

### 3. Conectar Cloudflare

1. En Cloudflare, anotá tu **Account ID** (aparece en la página principal de *Workers & Pages*, columna derecha).
2. Creá un token: *Mi perfil → API Tokens → Create Token → plantilla "Edit Cloudflare Workers"* → **Create**. Copialo (se muestra una sola vez).
3. En GitHub, en tu repo: *Settings → Secrets and variables → Actions*:
   - Pestaña **Secrets** → *New repository secret*:
     - `CLOUDFLARE_API_TOKEN` = el token del paso anterior
     - `CLOUDFLARE_ACCOUNT_ID` = tu Account ID
     - `COINGECKO_API_KEY` = *(opcional)* una "Demo API key" gratuita de https://www.coingecko.com/en/api, para evitar límites de consultas
   - Pestaña **Variables** → *New repository variable* (solo mientras no tengas dominio propio):
     - `SITE_URL` = `https://golong.TU-SUBDOMINIO.workers.dev` (lo vas a ver después del primer deploy)
4. En GitHub: pestaña **Actions** → *Actualizar y publicar* → **Run workflow**.

En 2 o 3 minutos el sitio queda online en `https://golong.<tu-subdominio>.workers.dev`. Desde ahí se actualiza solo.

> Mientras el sitio esté en `*.workers.dev`, se publica con `noindex` y `robots.txt` bloqueando buscadores: así Google no indexa la dirección temporal y después no hay contenido duplicado al pasar al dominio propio. Se desactiva solo cuando borrás la variable `SITE_URL`.

### 4. Dominio propio

`golong.com` y `golong.app` ya están registrados. **`golong.com.ar` y `golong.ar` parecían libres** al 20/09/2026 (verificalo en https://nic.ar).

1. Registralo en **NIC Argentina** (https://nic.ar, necesitás clave fiscal nivel 2). El costo anual es bajo; revisá el arancel vigente.
2. En Cloudflare: **Add a site** → `golong.com.ar` → plan **Free**. Cloudflare te da dos *nameservers*.
3. En NIC Argentina: *Mis dominios → Delegar* → cargá esos dos nameservers.
4. Cuando Cloudflare marque el dominio como activo: *Workers & Pages → golong → Settings → Domains & Routes → Add → Custom domain* → `golong.com.ar` (y también `www.golong.com.ar` si querés).
5. En `src/site.config.ts` confirmá que `domain: 'golong.com.ar'`, y en GitHub borrá la variable `SITE_URL`.

---

## Publicidad (Google AdSense)

1. Con el sitio ya en tu dominio y algunas semanas de contenido, pedí la cuenta en https://adsense.google.com.
2. Google te va a dar un ID tipo `ca-pub-1234567890123456`. Ponelo en `src/site.config.ts` → `adsense.client`. Eso activa el script de AdSense y genera `/ads.txt` automáticamente.
3. Cuando te aprueben, creá tres bloques de anuncios "Display" y copiá sus IDs en `adsense.slots` (`top`, `inline`, `footer`). Los espacios ya están reservados en el diseño para que no salten al cargar.
4. En AdSense → *Privacidad y mensajería*, activá el mensaje de consentimiento si vas a recibir visitas de Europa.

**Consejos para que te aprueben:** AdSense suele rechazar sitios que "solo muestran datos". Por eso cada página ya trae textos explicativos y preguntas frecuentes propios. Sumar notas o análisis cortos escritos por vos (por ejemplo, un resumen semanal del dólar) ayuda mucho.

**Expectativas:** lo que paga la publicidad por visita en Argentina es bajo. Hace falta bastante tráfico para que sea un ingreso relevante. Las búsquedas más competidas ("dólar blue hoy") las dominan medios grandes; las más específicas ("MEP implícito AL30", "plazo fijo le gana al dólar", "brecha cambiaria historial") son más alcanzables.

---

## Que te encuentren a vos en Google

- Completá `author.sameAs` en `src/site.config.ts` con tus perfiles (LinkedIn, GitHub, X). Eso alimenta los datos estructurados `Person` de `/sobre-mi` y es lo que le indica a Google que ese sitio es tuyo.
- Editá el texto de `src/pages/sobre-mi.astro` y, si querés, `author.jobTitle`.
- Poné el link a golong en tus perfiles (el vínculo tiene que ir en los dos sentidos).
- Dá de alta el sitio en **Google Search Console** (https://search.google.com/search-console), verificá el dominio desde Cloudflare y enviá el sitemap: `https://golong.com.ar/sitemap-index.xml`.

---

## Trabajar en tu compu

Requisitos: **Node.js 22.12 o superior** (https://nodejs.org).

```bash
npm install
npm run dev        # http://localhost:4321 con datos reales
npm run build      # genera dist/ con datos reales
npm run preview    # sirve dist/
```

Sin internet o para probar sin depender de las APIs:

```bash
npm run mock       # en una terminal: servidor con datos de prueba
npm run dev:mock   # en otra: sitio usando esos datos
```

Otros comandos útiles:

- `npm run check`: revisa tipos y errores.
- `node dev/make-images.mjs`: regenera íconos y la imagen para redes (`og.png`) si cambiás nombre o dominio.
- `node dev/shots.mjs / /dolar/blue --mobile --dark`: capturas de pantalla (requiere Playwright).

### Dónde tocar cada cosa

| Quiero cambiar… | Archivo |
|---|---|
| Nombre, dominio, autor, AdSense, email | `src/site.config.ts` |
| Colores, tipografía, espaciados | `src/styles/global.css` (variables al principio) |
| Textos de cada dólar | `src/content/dollars.ts` |
| Nombres de empresas | `src/content/names.ts` |
| Qué acciones, bonos o CEDEARs se muestran | `src/lib/sources.ts` |
| Frecuencia de actualización | `.github/workflows/deploy.yml` |

---

## Costos

| Concepto | Costo |
|---|---|
| Hosting (Cloudflare Workers, solo archivos estáticos) | US$0, sin límite de visitas |
| Actualizaciones (GitHub Actions, repo público) | US$0 |
| APIs de datos | US$0 |
| Dominio `.com.ar` | arancel anual de NIC Argentina |

Si el repo es **privado**, GitHub da 2.000 minutos por mes. Con la frecuencia actual se usa casi todo; en ese caso bajá la frecuencia en `deploy.yml` (por ejemplo, `*/30` en lugar de `*/15`).

---

## Fuentes y créditos

- [DolarApi](https://dolarapi.com) y [ArgentinaDatos](https://argentinadatos.com): proyectos de código abierto de la comunidad.
- [data912](https://data912.com): API gratuita de mercado argentino (con demora, sin garantía).
- [CoinGecko](https://www.coingecko.com): precios de criptomonedas.

Si alguna de estas fuentes cambia o deja de funcionar, el sitio sigue mostrando los últimos datos válidos y solo hay que adaptar `src/lib/sources.ts`.

La información del sitio es solo informativa y no constituye asesoramiento financiero.
