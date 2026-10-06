export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...options,
    headers: { ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options?.headers },
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data as T;
}
export function dateLabel(value: string | null) {
  if (!value) return 'No visits yet';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(value));
}
