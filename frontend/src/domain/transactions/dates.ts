export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

export function displayCalendarDate(value: string): string {
  const date = value.slice(0, 10);
  if (!isCalendarDate(date)) throw new RangeError("Invalid date");
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
}

export function parseCalendarDate(value: string): string | null {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return null;
  const iso = `${value.slice(6, 10)}-${value.slice(3, 5)}-${value.slice(0, 2)}`;
  return isCalendarDate(iso) ? iso : null;
}
