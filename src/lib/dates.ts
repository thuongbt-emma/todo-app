export const TZ = 'Asia/Ho_Chi_Minh';

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
});

/** Calendar day (YYYY-MM-DD) of an instant, in Vietnam time. */
export function toDayKey(d: Date): string {
  return dayFormat.format(d);
}

export function todayVN(now: Date = new Date()): string {
  return toDayKey(now);
}

/** A day string as a UTC-midnight Date — the representation Prisma uses for @db.Date. */
export function dayToDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function dateToDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const d = dayToDate(day);
  d.setUTCDate(d.getUTCDate() + n);
  return dateToDay(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((dayToDate(a).getTime() - dayToDate(b).getTime()) / 86_400_000);
}

export function weekStart(day: string): string {
  const dow = dayToDate(day).getUTCDay(); // 0 = Sunday
  return addDays(day, -((dow + 6) % 7));
}

/** The instant a Vietnam calendar day starts. */
export function vnStartOfDay(day: string): Date {
  return new Date(`${day}T00:00:00+07:00`);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "d/m[/y]" -> YYYY-MM-DD. Without a year: this year, or next year if that is >60 days ago. */
export function resolveDayMonth(d: number, m: number, y: number | null, today: string): string | null {
  const year = y ?? Number(today.slice(0, 4));
  const key = `${year}-${pad(m)}-${pad(d)}`;
  const check = dayToDate(key);
  if (Number.isNaN(check.getTime()) || dateToDay(check) !== key) return null;
  if (y === null && diffDays(key, today) < -60) return resolveDayMonth(d, m, year + 1, today);
  return key;
}

export function formatShort(day: string): string {
  const [, m, d] = day.split('-');
  return `${Number(d)}/${Number(m)}`;
}

export type DueTone = 'overdue' | 'soon' | 'normal';

export function dueTone(due: string, today: string): DueTone {
  const diff = diffDays(due, today);
  if (diff < 0) return 'overdue';
  if (diff <= 2) return 'soon';
  return 'normal';
}

/** A real YYYY-MM-DD calendar day: shape check plus calendar round-trip, so 2026-13-45 or 2026-02-31 is rejected. */
export function isValidDay(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = dayToDate(v);
  return !Number.isNaN(d.getTime()) && dateToDay(d) === v;
}
