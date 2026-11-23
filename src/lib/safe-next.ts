export function safeNext(value: string | null | undefined, fallback = "/teams"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback
  return value
}
