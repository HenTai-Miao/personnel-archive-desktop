/** 上传分片测试：自动队列再多也不能超过后端 multipart 请求上限。 */

import { describe, expect, it } from "vitest"
import { type QueuedWorkbook, splitUploadQueue } from "@/features/archive-import/queue-model"

function manualWorkbook(id: string, size: number): QueuedWorkbook {
  return {
    id,
    file: new File([new Uint8Array(size)], `${id}.xlsx`),
    source: { kind: "MANUAL" },
  }
}

describe("upload queue chunking", () => {
  it("preserves order while starting a new request before its byte budget is exceeded", () => {
    // Given
    const queue = [manualWorkbook("a", 6), manualWorkbook("b", 4), manualWorkbook("c", 6)]

    // When
    const chunks = splitUploadQueue(queue, 10)

    // Then
    expect(chunks.map((chunk) => chunk.map((workbook) => workbook.id))).toEqual([["a", "b"], ["c"]])
  })
})
