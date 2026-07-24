import type { Locator, Page } from "@playwright/test"

export function elementWidth(locator: Locator): Promise<number> {
  return locator.evaluate((element) => element.getBoundingClientRect().width)
}

export function roundedElementTop(locator: Locator): Promise<number> {
  return locator.evaluate((element) => Math.round(element.getBoundingClientRect().top))
}

export async function dragSeparatorLeft(
  page: Page,
  separator: Locator,
  distance: number,
): Promise<void> {
  const box = await separator.boundingBox()
  if (box === null) throw new TypeError("Preview separator has no layout box")
  const pointerX = box.x + box.width / 2
  const pointerY = box.y + 80
  await page.mouse.move(pointerX, pointerY)
  await page.mouse.down()
  await page.mouse.move(pointerX - distance, pointerY)
  await page.mouse.up()
}
