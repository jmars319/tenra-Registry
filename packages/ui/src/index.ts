export const registryTheme = {
  colors: {
    canvas: "#f4f0e8",
    panel: "#fffaf2",
    panelStrong: "#f0e6d8",
    border: "#d7c9b3",
    text: "#2f2418",
    muted: "#78695a",
    accent: "#2f6a4e",
    accentSoft: "#dcebdd",
    warning: "#a14d2a",
    warningSoft: "#f7e2d7"
  },
  radii: {
    small: 10,
    medium: 18,
    large: 28
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },
  shadows: {
    panel: "0 18px 40px rgba(75, 50, 22, 0.08)"
  }
} as const;

export const registryCssVariables = {
  "--rg-color-canvas": registryTheme.colors.canvas,
  "--rg-color-panel": registryTheme.colors.panel,
  "--rg-color-panel-strong": registryTheme.colors.panelStrong,
  "--rg-color-border": registryTheme.colors.border,
  "--rg-color-text": registryTheme.colors.text,
  "--rg-color-muted": registryTheme.colors.muted,
  "--rg-color-accent": registryTheme.colors.accent,
  "--rg-color-accent-soft": registryTheme.colors.accentSoft,
  "--rg-color-warning": registryTheme.colors.warning,
  "--rg-color-warning-soft": registryTheme.colors.warningSoft,
  "--rg-radius-small": `${registryTheme.radii.small}px`,
  "--rg-radius-medium": `${registryTheme.radii.medium}px`,
  "--rg-radius-large": `${registryTheme.radii.large}px`,
  "--rg-shadow-panel": registryTheme.shadows.panel
} as const;

export function formatCountLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
