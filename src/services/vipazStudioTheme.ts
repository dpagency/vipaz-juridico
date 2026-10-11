/** Configuração visual independente do motor de renderização (VIPAZ Studio v0). */
export interface VipazStudioTheme {
  studioVersion: 1;
  organizationName: string;
  headerText: string;
  footerText: string;
  fontFamily: string;
  fontSizeHalfPoints: number;
  textColor: string;
  mutedColor: string;
  marginTopTwips: number;
  marginBottomTwips: number;
  marginLeftTwips: number;
  marginRightTwips: number;
}

export const DEFAULT_VIPAZ_STUDIO_THEME: Readonly<VipazStudioTheme> = Object.freeze({
  studioVersion: 1,
  organizationName: 'VIPAZ Jurídico',
  headerText: 'VIPAZ Jurídico',
  footerText: 'Documento para revisão jurídica',
  fontFamily: 'Arial',
  fontSizeHalfPoints: 24,
  textColor: '0F172A',
  mutedColor: '64748B',
  marginTopTwips: 1440,
  marginBottomTwips: 1440,
  marginLeftTwips: 1700,
  marginRightTwips: 1440,
});

export function resolveVipazStudioTheme(overrides: Partial<VipazStudioTheme> = {}): VipazStudioTheme {
  const theme = { ...DEFAULT_VIPAZ_STUDIO_THEME, ...overrides };
  if (theme.studioVersion !== 1) throw new Error('Versão do tema VIPAZ Studio não suportada');
  for (const key of ['organizationName', 'headerText', 'footerText', 'fontFamily'] as const) {
    if (typeof theme[key] !== 'string' || theme[key].trim().length === 0 || theme[key].length > 180) {
      throw new Error('Configuração inválida: ' + key);
    }
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(theme.textColor) || !/^[0-9A-Fa-f]{6}$/.test(theme.mutedColor)) {
    throw new Error('Cores devem estar em hexadecimal RGB');
  }
  if (!Number.isInteger(theme.fontSizeHalfPoints) || theme.fontSizeHalfPoints < 16 || theme.fontSizeHalfPoints > 36) {
    throw new Error('Tamanho de fonte fora dos limites');
  }
  for (const key of ['marginTopTwips', 'marginBottomTwips', 'marginLeftTwips', 'marginRightTwips'] as const) {
    if (!Number.isInteger(theme[key]) || theme[key] < 360 || theme[key] > 2880) {
      throw new Error('Margem inválida: ' + key);
    }
  }
  return theme;
}
