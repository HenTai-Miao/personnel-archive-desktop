import type { Locator, Page } from "@playwright/test"

export function elementWidth(locator: Locator): Promise<number> {
  return locator.evaluate((element) => element.getBoundingClientRect().width)
}

export function roundedTop(locator: Locator): Promise<number> {
  return locator.evaluate((element) => Math.round(element.getBoundingClientRect().top))
}

export async function dragLeft(page: Page, separator: Locator, distance: number): Promise<void> {
  const box = await separator.boundingBox()
  if (box === null) throw new TypeError("Preview separator has no layout box")
  const pointerX = box.x + box.width / 2
  const pointerY = box.y + 80
  await page.mouse.move(pointerX, pointerY)
  await page.mouse.down()
  await page.mouse.move(Math.max(0, pointerX - distance), pointerY, { steps: 10 })
  await page.mouse.up()
}

export async function expandToMaximum(separator: Locator): Promise<void> {
  const maximum = Number(await separator.getAttribute("aria-valuemax"))
  for (let step = 0; step < 100; step += 1) {
    const current = Number(await separator.getAttribute("aria-valuenow"))
    if (current >= maximum) return
    await separator.press("ArrowLeft")
  }
  throw new RangeError("Preview separator did not reach its dynamic maximum")
}
