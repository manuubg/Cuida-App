import { push } from 'firebase/database';

const BRAZIL_TIME_ZONE = 'America/Sao_Paulo';

export const formatDateLabel = (date) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TIME_ZONE,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

export const formatBrazilTime = (date) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).format(date);

export const getBrazilDateParts = (date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
};

export const toLocalDateKey = (date) => {
  const { year, month, day } = getBrazilDateParts(date);
  return `${year}-${month}-${day}`;
};

export const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const localUriToDataUrl = async (uri) => {
  const response = await fetch(uri);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const userPath = (uid, collection) => `usuarios/${uid}/${collection}`;
export const PRIMARY_FAMILY_ID = 'principal';
export const familyDataPath = (uid, familyId, collection) => (
  familyId === PRIMARY_FAMILY_ID
    ? userPath(uid, collection)
    : userPath(uid, `familiares/${familyId}/${collection}`)
);
export const isValidTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export const formatTimeInput = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

export const getTimingLabel = (scheduledTime, takenAt) => {
  const [hours, minutes] = scheduledTime.split(':').map(Number);
  const currentParts = getBrazilDateParts(new Date(takenAt));
  const currentMinutes = Number(currentParts.hour || 0) * 60 + Number(currentParts.minute || 0);
  let difference = currentMinutes - (hours * 60 + minutes);
  if (difference > 720) difference -= 1440;
  if (difference < -720) difference += 1440;
  if (difference < -15) return { timing: 'early', label: 'Tomado adiantado' };
  if (difference > 15) return { timing: 'late', label: 'Tomado atrasado' };
  return { timing: 'on_time', label: 'Tomado no horário' };
};

export async function safePush(pathRef, data, ms = 8000) {
  const pushPromise = push(pathRef, data);
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms));
  return Promise.race([pushPromise, timeout]);
}
