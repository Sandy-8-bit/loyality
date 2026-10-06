import { test, expect } from '@playwright/test';
import { randomInt } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { management, projectUrl } from '../../scripts/supabase-management.mjs';

test('name and mobile open a persistent card without OTP, while admin APIs remain protected', async ({ page }) => {
  const phone = `9${randomInt(100000000, 999999999)}`;
  let customerId: string | undefined;
  const otpRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('/otp') || request.url().includes('send-otp')) otpRequests.push(request.url()); });
  try {
    await page.goto('/loyalty');
    await page.getByLabel('Your name', { exact: true }).fill('Kora browser test');
    await page.getByLabel('Mobile number').fill(phone);
    const joined = page.waitForResponse(response => response.url().endsWith('/api/auth/join'));
    await page.getByRole('button', { name: 'Get my loyalty card' }).click();
    const response = await joined;
    const profile = await response.json();
    expect(response.status(), profile.error).toBe(200);
    customerId = profile.id;
    await expect(page).toHaveURL(/\/loyalty\/profile$/);
    await expect(page.getByRole('heading', { name: /Hi, Kora browser test/ })).toBeVisible();
    await expect(page.getByLabel('0 of 6 visits completed')).toBeVisible();
    await expect(page.getByText(`+91${phone}`, { exact: true })).toBeVisible();
    expect(otpRequests).toEqual([]);
    expect((await page.request.get('/api/admin/customers')).status()).toBe(403);
    await page.reload();
    await expect(page.getByRole('heading', { name: /Hi, Kora browser test/ })).toBeVisible();
    const card = await (await page.request.get('/api/customer/loyalty')).json();
    expect(card.profile.id).toBe(customerId);
    expect(card.cycles).toHaveLength(1);
    await page.screenshot({ path: '.playwright-artifacts/member-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: '.playwright-artifacts/member-mobile.png', fullPage: true });
  } finally {
    if (customerId) {
      await page.request.post('/api/auth/logout');
      const keys = await management('api-keys');
      const serviceKey = keys.find((key: { name: string; api_key: string }) => key.name === 'service_role')?.api_key;
      const db = createClient(projectUrl!, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const { error } = await db.auth.admin.deleteUser(customerId);
      if (error) throw new Error(`Test customer cleanup failed: ${error.message}`);
    }
  }
});
