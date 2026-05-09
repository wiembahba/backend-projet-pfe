// ─── ProjetFlow — Dark UI Theme ───────────────────────────────────────────────

export const Colors = {
  // ── Backgrounds ──────────────────────────────────────────
  bg:           '#0A0A14',
  surface:      '#0F0E17',
  card:         '#141320',
  cardBorder:   '#1C1B2E',
  inputBg:      '#1C1B2E',
  inputBorder:  '#2A2940',

  // ── Navy (header / hero) ─────────────────────────────────
  navy950:      '#07060F',
  navy900:      '#0D0C1D',
  navy700:      '#1A1830',

  // ── Text ─────────────────────────────────────────────────
  white:        '#FFFFFF',
  text:         '#E8E7F5',
  textMuted:    '#6B6A85',
  textHint:     '#3A3858',

  // Aliases for backward-compat
  slate900:     '#E8E7F5',
  slate800:     '#D4D3E8',
  slate700:     '#B0AECB',
  slate600:     '#8D8BA8',
  slate500:     '#6B6A85',
  slate400:     '#524F6E',
  slate300:     '#3A3858',
  slate200:     '#2A2940',
  slate100:     '#1C1B2E',
  slate50:      '#0F0E17',

  // ── Accent — Blue ────────────────────────────────────────
  blue700:      '#1A3FA3',
  blue600:      '#2251CC',
  blue500:      '#3B6AE8',
  blue400:      '#5B8DEF',
  blue50:       '#1A2440',

  // ── Status colors ─────────────────────────────────────────
  green:        '#22C55E',
  green50:      '#0F2A1A',

  amber:        '#F59E0B',
  amber50:      '#2A1F0A',

  rose:         '#EF4444',
  roseMid:      '#7F2020',
  rose50:       '#2A0F0F',

  purple:       '#A855F7',
  purple50:     '#1E0F2A',
};

// ── Status badge styles ────────────────────────────────────
export const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  en_cours:  { label: 'En cours',  color: Colors.blue400,   bg: Colors.blue50  },
  termine:   { label: 'Terminé',   color: Colors.green,     bg: Colors.green50 },
  en_retard: { label: 'En retard', color: Colors.rose,      bg: Colors.rose50  },
  a_faire:   { label: 'À faire',   color: Colors.textMuted, bg: Colors.inputBg },
  en_pause:  { label: 'En pause',  color: Colors.amber,     bg: Colors.amber50 },
};

// ── Priority badge styles ──────────────────────────────────
export const PRIORITY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  haute:   { label: 'Haute',    color: Colors.rose,  bg: Colors.rose50  },
  moyenne: { label: 'Moyenne',  color: Colors.amber, bg: Colors.amber50 },
  basse:   { label: 'Basse',    color: Colors.green, bg: Colors.green50 },
  critique:{ label: 'Critique', color: '#FF3B30',    bg: '#2A0808'      },
};

// ── Role labels ────────────────────────────────────────────
export const ROLES: Record<string, string> = {
  admin:       'Administrateur',
  chef_projet: 'Chef de projet',
  employe:     'Employé',
};

// ── Role colors for Dashboard ──────────────────────────────
export const ROLE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  admin:       { bg: Colors.rose50,  text: Colors.rose,    label: 'Administrateur' },
  chef_projet: { bg: Colors.blue50,  text: Colors.blue500, label: 'Chef de projet' },
  employe:     { bg: Colors.green50, text: Colors.green,   label: 'Employé'        },
};

// ── Alias — tous les écrans qui importent { T } fonctionnent ──
export const T = Colors;