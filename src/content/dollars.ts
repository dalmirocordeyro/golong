// Textos de cada página de dólar. Contenido propio: ayuda al SEO y a la aprobación de AdSense.
import type { DollarSlug } from '../lib/types';

export interface DollarContent {
  title: string;
  description: string;
  lead: string;
  /** Explicación (HTML) */
  about: string;
  faq: { q: string; a: string }[];
}

const compraVenta = {
  q: '¿Qué diferencia hay entre el precio de compra y el de venta?',
  a: '<p>El precio de <strong>venta</strong> es lo que pagás si querés comprar dólares; el de <strong>compra</strong> es lo que te pagan si los vendés. La diferencia entre ambos se llama <em>spread</em> y es el margen de quien hace la operación.</p>',
};

export const DOLLAR_CONTENT: Record<DollarSlug, DollarContent> = {
  blue: {
    title: 'Dólar blue hoy: cotización en vivo y evolución',
    description: 'Cotización del dólar blue hoy en Argentina: precio de compra y venta en vivo, variación diaria, brecha con el oficial y gráfico histórico.',
    lead: 'Precio del dólar informal en Argentina, actualizado durante el día, con su variación y su historia.',
    about: `
      <h2>¿Qué es el dólar blue?</h2>
      <p>Es el precio del dólar en el mercado informal: el que se consigue en "cuevas" y con los llamados "arbolitos", por fuera del sistema financiero. No hay una cotización oficial: el valor que ves surge de relevamientos de operaciones en la city porteña y puede variar de un lugar a otro.</p>
      <p>Durante los años de controles cambiarios fue la referencia más mirada, porque mostraba el precio al que se podía conseguir dólares sin restricciones. Hoy sigue siendo un termómetro del humor del mercado y se compara con el oficial a través de la <a href="/brecha">brecha cambiaria</a>.</p>
      <h3>Algunas cosas a tener en cuenta</h3>
      <ul>
        <li>Operar en el mercado informal no está permitido y no tiene ninguna protección: no hay comprobante ni forma de reclamar.</li>
        <li>Las alternativas legales para comprar dólares son el <a href="/dolar/oficial">oficial</a> en bancos y billeteras, y el <a href="/dolar/mep">dólar MEP</a>.</li>
        <li>El blue suele operar de lunes a viernes en horario bancario; los fines de semana el precio se mantiene del último día hábil.</li>
      </ul>`,
    faq: [
      { q: '¿Por qué el dólar blue cambia de precio si es informal?', a: '<p>Porque responde a oferta y demanda como cualquier mercado. Los precios que se publican son un promedio de lo que informan distintos operadores a lo largo del día.</p>' },
      { q: '¿El dólar blue sube los fines de semana?', a: '<p>En general no: las operaciones informales se concentran en días hábiles. El dólar que sí se mueve todos los días es el <a href="/dolar/cripto">dólar cripto</a>, porque los exchanges operan 24/7.</p>' },
      compraVenta,
    ],
  },
  oficial: {
    title: 'Dólar oficial hoy: cotización del Banco Nación en vivo',
    description: 'Cotización del dólar oficial hoy en Argentina (Banco Nación): precio de compra y venta, variación diaria y gráfico histórico.',
    lead: 'El precio al que los bancos le venden dólares a las personas. Usamos como referencia al Banco Nación.',
    about: `
      <h2>¿Qué es el dólar oficial?</h2>
      <p>Es la cotización a la que los bancos compran y venden dólares a sus clientes en las ventanillas, el home banking y las apps. Cada banco fija su propio precio, pero suelen moverse muy cerca entre sí; por eso se toma como referencia el valor del Banco de la Nación Argentina.</p>
      <p>El oficial minorista se diferencia del <a href="/dolar/mayorista">dólar mayorista</a>, que es el precio al que operan bancos y empresas entre sí en el mercado de cambios. El minorista incluye el margen del banco, por eso siempre es algo más caro.</p>
      <h3>¿Cómo se relaciona con los otros dólares?</h3>
      <p>El oficial es la base contra la que se miden los demás. La diferencia porcentual con el blue, el MEP o el CCL es la <a href="/brecha">brecha cambiaria</a>. Y el <a href="/dolar/tarjeta">dólar tarjeta</a> se calcula a partir del oficial más los recargos impositivos vigentes.</p>`,
    faq: [
      { q: '¿El dólar oficial es igual en todos los bancos?', a: '<p>No exactamente. Cada entidad fija su precio, aunque las diferencias suelen ser chicas. Mostramos el del Banco Nación porque es el más usado como referencia.</p>' },
      { q: '¿Qué horario tiene el dólar oficial?', a: '<p>Se actualiza durante el horario del mercado de cambios, en días hábiles. Fuera de ese horario y los fines de semana queda el último precio informado.</p>' },
      compraVenta,
    ],
  },
  mep: {
    title: 'Dólar MEP hoy: cotización del dólar bolsa en vivo',
    description: 'Cotización del dólar MEP (dólar bolsa) hoy: precio en vivo, variación, brecha con el oficial, historial y cómo se calcula.',
    lead: 'El dólar que se obtiene de forma legal comprando y vendiendo bonos en la bolsa argentina.',
    about: `
      <h2>¿Qué es el dólar MEP?</h2>
      <p>MEP significa <em>Mercado Electrónico de Pagos</em>. También se lo llama "dólar bolsa". Es una forma legal de comprar dólares: comprás un bono (por ejemplo, el AL30) en pesos y lo vendés en su versión en dólares (AL30D). Los dólares quedan en tu cuenta de inversión y los podés transferir a tu cuenta bancaria.</p>
      <p>Se puede hacer desde el home banking de muchos bancos o desde cualquier broker (ALyC). Según la normativa vigente puede haber plazos mínimos de tenencia entre la compra y la venta del bono.</p>
      <h3>¿Cómo se calcula?</h3>
      <p>Dividiendo el precio del bono en pesos por su precio en dólares. Por eso cada bono tiene su propio "MEP implícito"; en la página de <a href="/bonos">bonos</a> lo mostramos para cada uno. La cotización de esta página es una referencia de mercado.</p>`,
    faq: [
      { q: '¿Es legal comprar dólar MEP?', a: '<p>Sí. Es una operación de mercado de capitales regulada por la CNV y se hace a través de bancos o brokers registrados.</p>' },
      { q: '¿Qué diferencia hay entre el MEP y el CCL?', a: '<p>El mecanismo es parecido, pero con el MEP los dólares quedan en una cuenta en Argentina. Con el <a href="/dolar/ccl">contado con liquidación</a> se acreditan en una cuenta del exterior.</p>' },
      { q: '¿Por qué el MEP de mi broker es distinto al de esta página?', a: '<p>Porque cada operación depende del bono, del plazo de liquidación y de las puntas de compra y venta en ese momento. Este valor es una referencia promedio del mercado.</p>' },
    ],
  },
  ccl: {
    title: 'Dólar CCL hoy: contado con liquidación en vivo',
    description: 'Cotización del dólar contado con liquidación (CCL) hoy: precio en vivo, variación diaria, brecha con el oficial e historial.',
    lead: 'El tipo de cambio para girar dólares al exterior a través de la bolsa.',
    about: `
      <h2>¿Qué es el dólar CCL?</h2>
      <p>El <em>contado con liquidación</em> es la operación que permite pasar pesos a dólares depositados en una cuenta del exterior. Funciona como el <a href="/dolar/mep">MEP</a>: se compra un activo en pesos (un bono o una acción que también cotiza afuera) y se vende en dólares, pero liquidándolo en el exterior.</p>
      <p>Lo usan principalmente empresas e inversores que necesitan dólares fuera del país. Por eso suele cotizar un poco por encima del MEP.</p>
      <h3>CCL implícito en ADRs y CEDEARs</h3>
      <p>Como muchas empresas argentinas cotizan en Buenos Aires y en Nueva York (<a href="/adrs">ADRs</a>), comparar ambos precios permite calcular un CCL implícito. Lo mismo pasa con los <a href="/cedears">CEDEARs</a>.</p>`,
    faq: [
      { q: '¿Quién puede operar CCL?', a: '<p>Cualquier persona con una cuenta en un broker local y una cuenta en el exterior donde recibir los dólares, respetando la normativa vigente.</p>' },
      { q: '¿Por qué el CCL es más caro que el MEP?', a: '<p>Porque los dólares quedan fuera del sistema argentino, algo que muchos inversores y empresas valoran más.</p>' },
      compraVenta,
    ],
  },
  cripto: {
    title: 'Dólar cripto hoy: precio de USDT y USDC en pesos',
    description: 'Cotización del dólar cripto hoy: precio de las stablecoins USDT y USDC en pesos argentinos, en vivo y todos los días de la semana.',
    lead: 'El precio en pesos de las monedas digitales atadas al dólar (stablecoins). Opera las 24 horas, todos los días.',
    about: `
      <h2>¿Qué es el dólar cripto?</h2>
      <p>Es el precio en pesos de las <em>stablecoins</em>, criptomonedas diseñadas para valer siempre un dólar, como USDT (Tether) o USDC. Se compran y venden en exchanges y billeteras virtuales.</p>
      <p>Como los exchanges operan las 24 horas, el dólar cripto es el único que se mueve los fines de semana y feriados. Por eso muchos lo miran como anticipo de lo que puede pasar el lunes con el MEP o el blue.</p>
      <h3>Riesgos</h3>
      <ul>
        <li>Una stablecoin depende de la solvencia y la transparencia de quien la emite.</li>
        <li>Los precios cambian entre exchanges y hay comisiones de compra, venta y retiro.</li>
      </ul>`,
    faq: [
      { q: '¿Por qué el dólar cripto se mueve el fin de semana?', a: '<p>Porque los exchanges de criptomonedas no cierran. El resto de los dólares queda quieto hasta el próximo día hábil.</p>' },
      { q: '¿USDT y USDC valen lo mismo?', a: '<p>Ambas buscan valer un dólar, pero en cada exchange pueden tener precios en pesos apenas distintos según la oferta y la demanda.</p>' },
      compraVenta,
    ],
  },
  tarjeta: {
    title: 'Dólar tarjeta hoy: cotización para compras en el exterior',
    description: 'Cotización del dólar tarjeta hoy: cuánto cuesta pagar en dólares con tarjeta, recargos sobre el oficial y evolución histórica.',
    lead: 'El tipo de cambio que se aplica al pagar en moneda extranjera con tarjeta de crédito o débito.',
    about: `
      <h2>¿Qué es el dólar tarjeta?</h2>
      <p>Es el valor que termina pagando quien usa su tarjeta para compras en el exterior, suscripciones digitales o servicios cobrados en dólares. Se calcula a partir del <a href="/dolar/oficial">dólar oficial</a> más los recargos impositivos vigentes, como la percepción a cuenta del impuesto a las Ganancias.</p>
      <p>Las percepciones no son un costo definitivo para todos: en muchos casos se pueden computar en la declaración jurada o pedir su devolución ante ARCA.</p>
      <h3>Consejo práctico</h3>
      <p>Si tenés dólares propios, muchas tarjetas permiten pagar el resumen en dólares y así evitar las percepciones. Consultalo con tu banco.</p>`,
    faq: [
      { q: '¿El dólar tarjeta es el mismo para todas las compras?', a: '<p>Aplica a consumos en moneda extranjera con tarjeta. Algunas compras pueden tener tratamientos distintos según la normativa vigente.</p>' },
      { q: '¿Cuándo se toma el tipo de cambio del resumen?', a: '<p>Depende del emisor: suele usarse la cotización del día de cierre o de pago del resumen.</p>' },
    ],
  },
  mayorista: {
    title: 'Dólar mayorista hoy: cotización del mercado de cambios',
    description: 'Cotización del dólar mayorista hoy (A3500): precio en vivo, variación diaria y evolución histórica del tipo de cambio mayorista.',
    lead: 'El tipo de cambio al que operan bancos, empresas, exportadores e importadores en el Mercado Libre de Cambios.',
    about: `
      <h2>¿Qué es el dólar mayorista?</h2>
      <p>Es el precio del dólar en el mercado donde operan las entidades financieras y las empresas: el Mercado Libre de Cambios (MLC). El Banco Central publica una referencia diaria conocida como <em>Comunicación A3500</em>.</p>
      <p>No lo usan las personas para comprar dólares, pero es clave para la economía: define cuánto reciben los exportadores, cuánto pagan los importadores y sirve de base para el <a href="/dolar/oficial">dólar oficial</a> minorista.</p>
      <h3>¿Qué mirar?</h3>
      <p>La velocidad a la que sube el mayorista frente a la <a href="/inflacion">inflación</a> muestra si el peso se aprecia o se deprecia en términos reales.</p>`,
    faq: [
      { q: '¿Puedo comprar dólares al precio mayorista?', a: '<p>No como persona. El mayorista es para operaciones entre bancos y empresas. Las personas acceden al oficial minorista o al MEP.</p>' },
      { q: '¿Qué es la Comunicación A3500?', a: '<p>Es el tipo de cambio de referencia que publica el BCRA cada día hábil a partir de las operaciones del mercado mayorista.</p>' },
    ],
  },
};
