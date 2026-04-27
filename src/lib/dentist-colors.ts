export const DENTIST_VARS: Record<string, { bgVar: string; textVar: string }> = {
  "Renata Lyra":    { bgVar: "--dentist-renata-bg",   textVar: "--dentist-renata-text" },
  "Dione Melo":     { bgVar: "--dentist-dione-bg",    textVar: "--dentist-dione-text" },
  "Juliano Borelli":{ bgVar: "--dentist-juliano-bg",  textVar: "--dentist-juliano-text" },
};

const DEFAULT_STYLE = {
  backgroundColor: "hsl(var(--muted))",
  color: "hsl(var(--muted-foreground))",
} as const;

export function dentistStyle(name: string | undefined): { backgroundColor: string; color: string } {
  const vars = name ? DENTIST_VARS[name] : undefined;
  if (!vars) return DEFAULT_STYLE;
  return {
    backgroundColor: `hsl(var(${vars.bgVar}))`,
    color: `hsl(var(${vars.textVar}))`,
  };
}
