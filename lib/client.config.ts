// ─────────────────────────────────────────────────────────────────────────────
//  CONFIG DEL CLIENTE — la ÚNICA fuente de verdad de lo específico de la empresa.
//
//  El sistema es config-driven: Bahía es la "config #1". Para montar un cliente
//  nuevo se edita SOLO este archivo (+ los assets en public/assets). Los agentes y
//  los visuales leen de aquí; no hay datos de la empresa quemados en su código.
// ─────────────────────────────────────────────────────────────────────────────

export type Membership = { name: string; price: string; setup?: string; detail: string }
export type Accent = { main: string; light: string; glow: string } // glow = "r,g,b" para rgba()

export const CLIENT = {
  // ── Identidad ──────────────────────────────────────────────────────────────
  name: 'Bahía Social Sports Club',
  shortName: 'Bahía',
  brandMark: 'BAH.ÍA',
  industry: 'club deportivo-social premium',
  get oneLiner() {
    return `${this.name}, ${this.industry} en ${this.location.city}, ${this.location.state}.`
  },

  // ── Ubicación ────────────────────────────────────────────────────────────────
  location: {
    address: 'Paseo de los Flamingos, Nuevo Vallarta, Nayarit',
    city: 'Nuevo Vallarta',
    state: 'Nayarit',
    region: 'Riviera Nayarit / Bahía de Banderas',
    searchRegion: 'Riviera Nayarit, Bahía de Banderas, Nuevo Vallarta, Puerto Vallarta',
    adCities: ['Nuevo Vallarta', 'Bucerías', 'Puerto Vallarta'],
    note: 'A 10 min del aeropuerto de Puerto Vallarta.',
  },

  // ── Oferta (instalaciones + membresías) ──────────────────────────────────────
  facilities:
    '8 canchas de pádel techadas + 8 pickleball + tenis · alberca olímpica y albercas exteriores con asoleadero · gym funcional, spinning, yoga · vestidores premium, salón de belleza, cafetería, salones de eventos · lago natural.',
  facilitiesShort: '8 canchas pádel, 8 pickleball, tenis, alberca olímpica, gym funcional, spinning, yoga',
  facilitiesList: [
    '8 canchas de pádel techadas',
    '8 canchas de pickleball',
    'Canchas de tenis de concreto y de arcilla',
    'Albercas exteriores con asoleadero y palapa',
    'Gym funcional',
    'Salón de spinning',
    'Área de yoga y terraza con vistas',
    'Vestidores premium con regaderas',
    'Salón de belleza',
    'Cocina / cafetería',
    'Salones para eventos',
    'Lago natural rodeado de vegetación tropical',
  ],

  memberships: [
    { name: 'Familiar', price: '$6,500/mes', setup: 'inscripción $13,000', detail: '2 adultos + hasta 3 hijos menores de 28 años. Acceso a todo.' },
    { name: 'Pareja', price: '$4,500/mes', setup: 'inscripción $9,000', detail: '2 adultos. Acceso a todo.' },
    { name: 'Individual', price: '$2,500/mes', setup: 'inscripción $5,000', detail: '1 adulto. Acceso a todo.' },
    { name: 'Solo Gym', price: '$1,800/mes', setup: 'inscripción $3,600', detail: '1 adulto. Solo gym, vestidores y alberca. Sin acceso a canchas de raqueta.' },
  ] as Membership[],
  membershipsLine: 'Familiar $6,500 · Pareja $4,500 · Individual $2,500 · Solo Gym $1,800 (mensual)',
  topMembershipPrice: '$6,500',

  // ── Contacto / redes ─────────────────────────────────────────────────────────
  contact: {
    instagram: '@bahiaclub.mx',
    email: 'membresias@bahiaclub.mx',
    whatsapp: 'https://wa.me/message/47BNUPNJYZDWL1',
    calendar: 'https://calendar.app.google/cedvSmtcwGR3grVc6',
    website: '',
  },

  // ── Audiencia (tendencias / segmentación) ────────────────────────────────────
  audienceProfile: `AUDIENCIA OBJETIVO (filtra TODO por este perfil):
- Familias premium con hijos (ingreso familiar >$80k MXN/mes), residentes Nuevo Vallarta/Bucerías/La Cruz
- Parejas jóvenes profesionales 28-45 años con lifestyle activo
- Turistas norteamericanos y canadienses de alto poder adquisitivo (snowbirds + vacaciones premium)
- Expats viviendo en la zona Vallarta/Riviera Nayarit
- Empresarios de Tepic/Guadalajara con segunda residencia en la costa
DESCARTA cualquier tendencia de: gym low-cost (Smartfit, Sport City masivo), home workouts gratuitos, apps fitness sin costo, rutinas sin equipo, noticias de deporte profesional sin impacto local, tendencias de masa sin conexión a lifestyle premium o comunidad real.`,

  // ── Tendencias ───────────────────────────────────────────────────────────────
  trendKeywords: ['padel', 'pickleball', 'natacion', 'wellness mexico', 'vida activa'],
  adLibraryTerms: [
    // Mercado general — lifestyle, wellness, turismo deportivo MX
    'wellness México', 'vida activa familia', 'vacaciones activas México',
    'resort deportivo', 'actividades Riviera Nayarit', 'membresía fitness premium',
    // Mercado específico — clubes deportivos sin importar ubicación
    'club deportivo membresía', 'club pádel', 'club pickleball',
    'club deportivo familia', 'padel club México', 'social sports club',
    'club tenis México', 'club raqueta membresía',
    // Competencia directa zona
    'club deportivo Vallarta', 'membresía gym Nayarit', 'pádel Puerto Vallarta',
  ],

  // ── Voz de marca (contenido) ─────────────────────────────────────────────────
  brandVoice: `VOZ DE MARCA — aplícala siempre:
• Personalidad: premium pero cálida; aspiracional sin presumir; comunidad y pertenencia (NO individualismo de gym).
• Sí: lenguaje sensorial (mar, luz, movimiento), pertenencia ("tu lugar", "los nuestros"), confianza serena, verbos activos.
• No: clichés de gym ("sin excusas", "no pain no gain"), urgencia agresiva, tecnicismos fríos, exceso de emojis.
• Mecánica: frases cortas, una idea por línea, español de México natural. Premium = claridad y calma, no gritar.`,

  // ── Fotos reales por deporte (pósters de eventos) ────────────────────────────
  photoBySport: [
    { match: ['pickle'], photo: '/assets/pickleball-lifestyle.jpg' },
    { match: ['padel', 'pádel', 'paddle'], photo: '/assets/pickleball-01.jpg' },
    { match: ['tenis', 'tennis'], photo: '/assets/cancha-tenis-arcilla.jpg' },
    { match: ['natac', 'alberca', 'nado', 'aqua', 'swim', 'pool'], photo: '/assets/alberca-01.jpg' },
    { match: ['gym', 'funcional', 'fuerza', 'spinning', 'yoga', 'pilates', 'cross'], photo: '/assets/gym.png' },
  ],
  photoDefault: '/assets/alberca-restaurante.png',

  // ── Meta Ads (targeting por defecto) ─────────────────────────────────────────
  adTargeting: { ageMin: 25, ageMax: 55, genders: [1, 2], budgetDaily: 2500 },

  // ── Marca visual (pósters / carrusel) ────────────────────────────────────────
  // Todo lo que el kit de diseño necesita para verse on-brand. Un cliente nuevo
  // cambia estos valores + sus imágenes de logo en public/assets.
  brand: {
    wordmark: 'BAHÍA',
    tagline: 'Social Sports Club',
    navy: '#0A1024',        // fondo base del panel/pieza
    navyRgb: '10,16,36',    // mismo navy en r,g,b para rgba() de los scrims
    navyRaised: '#101A33',  // tono más claro (top de gradientes)
    navyPanel: '#0C1428',   // tono del panel de marca (híbrido)
    navyDeep: '#070B18',    // tono más oscuro (fondo)
    wordmarkColor: '#F5EFE2', // color del wordmark (crema neutro)
    // Acentos de paleta — el color varía por deporte/tema (no todo es dorado).
    accentDefault: { main: '#C9A85C', light: '#E4C786', glow: '201,168,92' } as Accent, // oro
    accentBySport: [
      { match: ['padel', 'pádel', 'paddle'], accent: { main: '#5B79D6', light: '#9DB2EE', glow: '91,121,214' } },
      { match: ['pickle'], accent: { main: '#D98558', light: '#EBB093', glow: '217,133,88' } },
      { match: ['tenis', 'tennis'], accent: { main: '#C9A85C', light: '#E4C786', glow: '201,168,92' } },
      { match: ['natac', 'alberca', 'nado', 'aqua', 'swim', 'pool'], accent: { main: '#5B79D6', light: '#9DB2EE', glow: '91,121,214' } },
      { match: ['gym', 'funcional', 'fuerza', 'spinning', 'yoga', 'pilates', 'cross'], accent: { main: '#8AA088', light: '#B3C6AF', glow: '138,160,136' } },
    ] as { match: string[]; accent: Accent }[],
    // Isotipo/logo por color de acento (glow → ruta) + watermark de fondo.
    logoByGlow: {
      '91,121,214': '/assets/whale-blue.png',
      '201,168,92': '/assets/whale-gold.png',
      '138,160,136': '/assets/whale-sage.png',
      '217,133,88': '/assets/whale-cream.png',
    } as Record<string, string>,
    logoDefault: '/assets/whale-cream.png',
    logoWatermark: '/assets/whale-cream.png',

    // ── Dashboard (chrome del panel del admin) ──
    sidebarLogo: '/assets/whale-gold.png',   // logo del sidebar
    pageWatermark: '/assets/whale-white.png', // marca de agua sutil en cada página
    primaryColor: '#C9A85C',                  // color primario del tema (--color-primary)
    appTitle: 'Bahía · Agentes de Marketing IA',
    appDescription: 'Panel de control de los agentes de marketing IA del Bahía Social Sports Club.',
  },
}

export type ClientConfig = typeof CLIENT
