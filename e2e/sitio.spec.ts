import { test, expect } from '@playwright/test'

test('/ redirige a bahia-sitio.html', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/bahia-sitio\.html/)
  await expect(page).toHaveTitle('Bahía · Social Sports Club')
})

test('/bahia-sitio.html carga el sitio del club', async ({ page }) => {
  await page.goto('/bahia-sitio.html')
  await expect(page).toHaveTitle('Bahía · Social Sports Club')
})

test('/presentacion sirve el deck de agentes IA', async ({ page }) => {
  await page.goto('/presentacion')
  await expect(page).toHaveTitle('Sistema de Agentes IA — Bahía Club')
})

test('/comparacion sirve la página de comparativa', async ({ page }) => {
  const res = await page.goto('/comparacion')
  expect(res?.status()).toBe(200)
})

test('/guia sirve la guía de implementación', async ({ page }) => {
  const res = await page.goto('/guia')
  expect(res?.status()).toBe(200)
})
