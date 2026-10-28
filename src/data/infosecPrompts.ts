import type { GamePrompt } from '../types/game';

/**
 * Banco de prompts de BreachParty: humor de trinchera para un equipo de
 * Seguridad de la Información y Protección de Datos Personales.
 * Sin datos reales, sin señalar personas: todo es ficción de oficina.
 */
export const PROMPT_BANK: GamePrompt[] = [
  {
    id: 'p01',
    category: 'phishing',
    text: 'La peor excusa que dio un usuario para explicar por qué hizo clic en un enlace de Phishing evidente.',
  },
  {
    id: 'p02',
    category: 'privacy',
    text: "Lo que realmente piensa el oficial de Protección de Datos cuando un área pide 'un proyectito urgente sin pasar por revisión'.",
  },
  {
    id: 'p03',
    category: 'culture',
    text: 'La contraseña más insegura pero creativa encontrada pegada en un post-it debajo del teclado.',
  },
  {
    id: 'p04',
    category: 'privacy',
    text: 'El motivo más absurdo por el que alguien enviaría una solicitud de derechos ARCO a las 11:59 PM de un viernes.',
  },
  {
    id: 'p05',
    category: 'policy',
    text: "Lo que significa realmente cuando el equipo de Seguridad dice: 'Estamos actualizando las políticas de cumplimiento'.",
  },
  {
    id: 'p06',
    category: 'culture',
    text: 'El hallazgo más perturbador que podrías encontrar auditando una carpeta compartida olvidada desde 2018.',
  },
  {
    id: 'p07',
    category: 'phishing',
    text: 'El nombre del próximo malware que atacará exclusivamente a reuniones que pudieron ser un correo.',
  },
  {
    id: 'p08',
    category: 'phishing',
    text: "La frase que dices en voz alta cuando el navegador grita 'Conexión no segura' y decides continuar igual.",
  },
  {
    id: 'p09',
    category: 'ops',
    text: 'La frase que nunca quieres escuchar de tu proveedor de nube un viernes a las 6 PM.',
  },
  {
    id: 'p10',
    category: 'policy',
    text: 'El nuevo control de seguridad que propondrías si supieras que nadie lo va a implementar.',
  },
  {
    id: 'p11',
    category: 'ops',
    text: 'La excusa oficial del área de TI para reiniciar el servidor de producción en horario laboral.',
  },
  {
    id: 'p12',
    category: 'privacy',
    text: 'Cómo explicarías a un nuevo colaborador qué es un dato personal sin que se asuste.',
  },
  {
    id: 'p13',
    category: 'phishing',
    text: 'El peor lugar donde alguien ha escondido una llave de API en un repositorio público.',
  },
  {
    id: 'p14',
    category: 'culture',
    text: 'Lo que realmente ocurre en la sala de espera de una auditoría de ISO 27001.',
  },
  {
    id: 'p15',
    category: 'culture',
    text: 'El nombre del comité que se crearía para decidir si se puede usar una hoja de cálculo como base de datos de clientes.',
  },
  {
    id: 'p16',
    category: 'privacy',
    text: "La respuesta más honesta a '¿por qué necesitas acceso a toda la carpeta de Finanzas?'.",
  },
  {
    id: 'p17',
    category: 'ops',
    text: 'El mensaje de error que más miedo da encontrar en un log a las 3 AM.',
  },
  {
    id: 'p18',
    category: 'policy',
    text: 'Lo que tu yo del futuro le diría a tu yo que aprobó esa excepción de firewall permanente.',
  },
  {
    id: 'p19',
    category: 'culture',
    text: 'El título del curso obligatorio de concientización que sí despertaría a todos.',
  },
  {
    id: 'p20',
    category: 'ops',
    text: 'La forma más creativa de perder un USB con datos de clientes.',
  },
  {
    id: 'p21',
    category: 'privacy',
    text: "Lo que se dice en la reunión donde se decide si el incidente 'es reportable'.",
  },
  {
    id: 'p22',
    category: 'policy',
    text: 'El apodo interno del proveedor que tardó nueve meses en firmar el acuerdo de tratamiento de datos.',
  },
  {
    id: 'p23',
    category: 'policy',
    text: 'La nueva política de escritorio limpio, explicada con un solo ejemplo real.',
  },
  {
    id: 'p24',
    category: 'culture',
    text: 'El regalo de fin de año ideal para el compañero que reutiliza contraseñas.',
  },
  {
    id: 'p25',
    category: 'ops',
    text: 'Lo que piensa el servidor de respaldos cuando nadie ha probado una restauración en dos años.',
  },
  {
    id: 'p26',
    category: 'phishing',
    text: 'La frase con la que un atacante cerraría su reporte de vulnerabilidad si tuviera sentido del humor.',
  },
  {
    id: 'p27',
    category: 'culture',
    text: 'El peor nombre para una campaña interna de seguridad, aprobado por unanimidad.',
  },
  {
    id: 'p28',
    category: 'policy',
    text: "Cómo justificarías migrar todo a la nube sin decir 'porque se ve moderno'.",
  },
  {
    id: 'p29',
    category: 'privacy',
    text: 'El correo automático que la intranet enviaría si tuviera consciencia y rencor.',
  },
  {
    id: 'p30',
    category: 'ops',
    text: 'La última voluntad del administrador de contraseñas corporativo antes de expirar.',
  },
];

/** Respuestas de reserva cuando el reloj termina y alguien no escribió nada. */
export const FALLBACK_ANSWERS: string[] = [
  'Estaba en una reunión que sí pudo ser un correo.',
  'Lo apruebo en producción y lo documentamos después.',
  'Eso lo autorizó alguien que ya no trabaja aquí.',
  'El sistema lo pidió, yo solo hice clic.',
  'Lo subí a la nube para compartirlo mejor.',
  'Nadie leyó la política, así que técnicamente no existe.',
];
