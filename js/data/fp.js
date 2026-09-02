/* ==========================================================================
   Catálogo de Formación Profesional en España: las 26 familias oficiales y
   sus ciclos formativos, separados por grado.

   Si un ciclo no aparece, el formulario deja escribirlo a mano, así que la
   lista puede quedarse corta sin bloquear a nadie.
   ========================================================================== */

Studdy.fp = (function () {
  'use strict';

  var CATALOGO = {
    'Actividades Físicas y Deportivas': {
      'Básico': ['Acceso y Conservación en Instalaciones Deportivas'],
      'Medio': ['Guía en el Medio Natural y de Tiempo Libre', 'Conducción de Actividades Físico-deportivas en el Medio Natural'],
      'Superior': ['Enseñanza y Animación Sociodeportiva', 'Acondicionamiento Físico'],
    },
    'Administración y Gestión': {
      'Básico': ['Servicios Administrativos'],
      'Medio': ['Gestión Administrativa'],
      'Superior': ['Administración y Finanzas', 'Asistencia a la Dirección'],
    },
    'Agraria': {
      'Básico': ['Agro-jardinería y Composiciones Florales', 'Actividades Agropecuarias', 'Aprovechamientos Forestales'],
      'Medio': ['Producción Agropecuaria', 'Jardinería y Floristería', 'Aprovechamiento y Conservación del Medio Natural'],
      'Superior': ['Paisajismo y Medio Rural', 'Gestión Forestal y del Medio Natural', 'Ganadería y Asistencia en Sanidad Animal'],
    },
    'Artes Gráficas': {
      'Básico': ['Artes Gráficas'],
      'Medio': ['Preimpresión Digital', 'Impresión Gráfica', 'Postimpresión y Acabados Gráficos'],
      'Superior': ['Diseño y Edición de Publicaciones Impresas y Multimedia', 'Diseño y Gestión de la Producción Gráfica'],
    },
    'Artes y Artesanías': {
      'Medio': ['Artesanía y Ornamentación Tradicional'],
      'Superior': ['Artista Fallero y Construcción de Escenografías'],
    },
    'Comercio y Marketing': {
      'Básico': ['Servicios Comerciales'],
      'Medio': ['Actividades Comerciales', 'Comercialización de Productos Alimentarios'],
      'Superior': ['Marketing y Publicidad', 'Comercio Internacional', 'Gestión de Ventas y Espacios Comerciales', 'Transporte y Logística'],
    },
    'Edificación y Obra Civil': {
      'Básico': ['Reforma y Mantenimiento de Edificios'],
      'Medio': ['Construcción', 'Obras de Interior, Decoración y Rehabilitación'],
      'Superior': ['Proyectos de Edificación', 'Proyectos de Obra Civil', 'Organización y Control de Obras de Construcción'],
    },
    'Electricidad y Electrónica': {
      'Básico': ['Electricidad y Electrónica'],
      'Medio': ['Instalaciones Eléctricas y Automáticas', 'Instalaciones de Telecomunicaciones'],
      'Superior': ['Sistemas Electrotécnicos y Automatizados', 'Sistemas de Telecomunicaciones e Informáticos', 'Mantenimiento Electrónico', 'Automatización y Robótica Industrial'],
    },
    'Energía y Agua': {
      'Medio': ['Redes y Estaciones de Tratamiento de Aguas'],
      'Superior': ['Eficiencia Energética y Energía Solar Térmica', 'Energías Renovables', 'Gestión del Agua', 'Centrales Eléctricas'],
    },
    'Fabricación Mecánica': {
      'Básico': ['Fabricación y Montaje'],
      'Medio': ['Mecanizado', 'Soldadura y Calderería', 'Conformado por Moldeo de Metales y Polímeros'],
      'Superior': ['Programación de la Producción en Fabricación Mecánica', 'Diseño en Fabricación Mecánica', 'Construcciones Metálicas'],
    },
    'Hostelería y Turismo': {
      'Básico': ['Cocina y Restauración', 'Alojamiento y Lavandería'],
      'Medio': ['Cocina y Gastronomía', 'Servicios en Restauración', 'Panadería, Repostería y Confitería'],
      'Superior': ['Dirección de Cocina', 'Dirección de Servicios de Restauración', 'Gestión de Alojamientos Turísticos', 'Agencias de Viajes y Gestión de Eventos', 'Guía, Información y Asistencias Turísticas'],
    },
    'Imagen Personal': {
      'Básico': ['Peluquería y Estética'],
      'Medio': ['Peluquería y Cosmética Capilar', 'Estética y Belleza'],
      'Superior': ['Estética Integral y Bienestar', 'Estilismo y Dirección de Peluquería', 'Caracterización y Maquillaje Profesional'],
    },
    'Imagen y Sonido': {
      'Medio': ['Vídeo Disc-jockey y Sonido'],
      'Superior': ['Realización de Proyectos Audiovisuales y Espectáculos', 'Producción de Audiovisuales y Espectáculos', 'Sonido para Audiovisuales y Espectáculos', 'Iluminación, Captación y Tratamiento de la Imagen', 'Animaciones 3D, Juegos y Entornos Interactivos'],
    },
    'Industrias Alimentarias': {
      'Básico': ['Actividades de Panadería y Pastelería'],
      'Medio': ['Elaboración de Productos Alimenticios', 'Aceites de Oliva y Vinos', 'Panificación y Bollería Industrial'],
      'Superior': ['Procesos y Calidad en la Industria Alimentaria', 'Vitivinicultura'],
    },
    'Industrias Extractivas': {
      'Medio': ['Excavaciones y Sondeos', 'Piedra Natural'],
      'Superior': ['Transformación de la Piedra Natural'],
    },
    'Informática y Comunicaciones': {
      'Básico': ['Informática y Comunicaciones', 'Informática de Oficina'],
      'Medio': ['Sistemas Microinformáticos y Redes'],
      'Superior': ['Desarrollo de Aplicaciones Web (DAW)', 'Desarrollo de Aplicaciones Multiplataforma (DAM)', 'Administración de Sistemas Informáticos en Red (ASIR)', 'Ciberseguridad en Entornos de las Tecnologías de la Información'],
    },
    'Instalación y Mantenimiento': {
      'Medio': ['Instalaciones de Producción de Calor', 'Instalaciones Frigoríficas y de Climatización', 'Mantenimiento Electromecánico'],
      'Superior': ['Mecatrónica Industrial', 'Mantenimiento de Instalaciones Térmicas y de Fluidos'],
    },
    'Madera, Mueble y Corcho': {
      'Básico': ['Carpintería y Mueble'],
      'Medio': ['Carpintería y Mueble', 'Instalación y Amueblamiento'],
      'Superior': ['Diseño y Amueblamiento'],
    },
    'Marítimo-Pesquera': {
      'Básico': ['Actividades Marítimo-Pesqueras'],
      'Medio': ['Navegación y Pesca de Litoral', 'Mantenimiento y Control de la Maquinaria de Buques y Embarcaciones', 'Cultivos Acuícolas'],
      'Superior': ['Transporte Marítimo y Pesca de Altura', 'Organización del Mantenimiento de Maquinaria de Buques y Embarcaciones', 'Acuicultura'],
    },
    'Química': {
      'Medio': ['Operaciones de Laboratorio', 'Planta Química'],
      'Superior': ['Laboratorio de Análisis y Control de Calidad', 'Química Industrial', 'Fabricación de Productos Farmacéuticos, Biotecnológicos y Afines'],
    },
    'Sanidad': {
      'Medio': ['Cuidados Auxiliares de Enfermería', 'Farmacia y Parafarmacia', 'Emergencias Sanitarias'],
      'Superior': ['Higiene Bucodental', 'Laboratorio Clínico y Biomédico', 'Anatomía Patológica y Citodiagnóstico', 'Imagen para el Diagnóstico y Medicina Nuclear', 'Radioterapia y Dosimetría', 'Dietética', 'Documentación y Administración Sanitarias', 'Audiología Protésica', 'Ortoprótesis y Productos de Apoyo'],
    },
    'Seguridad y Medio Ambiente': {
      'Medio': ['Emergencias y Protección Civil'],
      'Superior': ['Educación y Control Ambiental', 'Coordinación de Emergencias y Protección Civil', 'Química y Salud Ambiental'],
    },
    'Servicios Socioculturales y a la Comunidad': {
      'Básico': ['Actividades Domésticas y Limpieza de Edificios'],
      'Medio': ['Atención a Personas en Situación de Dependencia'],
      'Superior': ['Educación Infantil', 'Integración Social', 'Animación Sociocultural y Turística', 'Mediación Comunicativa', 'Promoción de Igualdad de Género'],
    },
    'Textil, Confección y Piel': {
      'Básico': ['Tapicería y Cortinaje', 'Arreglo y Reparación de Artículos Textiles y de Piel'],
      'Medio': ['Confección y Moda', 'Calzado y Complementos de Moda'],
      'Superior': ['Patronaje y Moda', 'Vestuario a Medida y de Espectáculos', 'Diseño Técnico en Textil y Piel'],
    },
    'Transporte y Mantenimiento de Vehículos': {
      'Básico': ['Mantenimiento de Vehículos'],
      'Medio': ['Electromecánica de Vehículos Automóviles', 'Carrocería', 'Mantenimiento de Material Rodante Ferroviario'],
      'Superior': ['Automoción', 'Mantenimiento Aeromecánico de Aviones', 'Mantenimiento de Sistemas Electrónicos y Aviónicos de Aeronaves'],
    },
    'Vidrio y Cerámica': {
      'Básico': ['Vidriería y Alfarería'],
      'Medio': ['Operaciones de Fabricación de Productos Cerámicos'],
      'Superior': ['Desarrollo y Fabricación de Productos Cerámicos'],
    },
  };

  var FAMILIAS = Object.keys(CATALOGO).sort(function (a, b) {
    return a.localeCompare(b, 'es');
  });

  // Ciclos de una familia y un grado. Si no hay ninguno recogido, devuelve
  // una lista vacía y el formulario se queda solo con el campo libre.
  function ciclos(familia, grado) {
    var f = CATALOGO[familia];
    if (!f || !grado || !f[grado]) return [];
    return f[grado].slice().sort(function (a, b) { return a.localeCompare(b, 'es'); });
  }

  // Grados que existen realmente en esa familia.
  function grados(familia) {
    var f = CATALOGO[familia];
    if (!f) return ['Básico', 'Medio', 'Superior'];
    return ['Básico', 'Medio', 'Superior'].filter(function (g) {
      return f[g] && f[g].length;
    });
  }

  return { familias: FAMILIAS, ciclos: ciclos, grados: grados };
})();
