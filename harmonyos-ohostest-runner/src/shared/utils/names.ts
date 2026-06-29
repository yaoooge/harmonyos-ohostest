export function sanitizeName(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]+/g, "_");
}
