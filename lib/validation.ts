import { z } from 'zod';

export function normalizePhone(value: string) {
  const digits = value.replace(/[\s()+-]/g, '');
  const local = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(local)) throw new Error('Enter a valid 10-digit Indian mobile number.');
  return `+91${local}`;
}
export const nameSchema = z.object({ name: z.string().trim().min(2, 'Please enter at least 2 characters.').max(60) });
export const joinSchema = nameSchema.extend({ phone: z.string().max(20).transform(normalizePhone) });
export const loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(200) });
export const codeSchema = z.object({ code: z.string().trim().toUpperCase().regex(/^\d{4}[A-Z]{2}$/, 'Use the four digits and two letters from the shopkeeper.') });
export const rewardSchema = z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(240), image_url: z.string().max(2000).nullable() });
export const shopSchema = z.object({ name: z.string().trim().min(2).max(60), tagline: z.string().trim().max(100), website_url: z.union([z.url().refine((v) => v.startsWith('https://'), 'Use an HTTPS website address.'), z.literal('')]).transform(v => v || null) });
