/**
 * 刷新凭据的本地保管层：只保存系统密钥加密后的内容，访问令牌始终留在 renderer 内存。
 */
import { readFile, unlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { app, safeStorage } from "electron"
import { refreshCredentialSchema } from "../shared/ipc-contract"

function credentialPath(): string {
  return join(app.getPath("userData"), "refresh-token.bin")
}

export async function saveRefreshCredential(input: unknown): Promise<void> {
  const credential = refreshCredentialSchema.parse(input)
  // safeStorage 不可用时拒绝降级到明文，从而避免“能登录但泄露长期凭据”的状态。
  if (!safeStorage.isEncryptionAvailable()) {
    throw new CredentialStorageError("当前系统无法安全保存登录凭据")
  }
  // 0600 是额外的文件系统防线；真正的机密性仍由系统凭据存储提供。
  await writeFile(credentialPath(), safeStorage.encryptString(credential), { mode: 0o600 })
}

export async function loadRefreshCredential(): Promise<string | null> {
  try {
    const encrypted = await readFile(credentialPath())
    if (!safeStorage.isEncryptionAvailable()) {
      return null
    }
    return refreshCredentialSchema.parse(safeStorage.decryptString(encrypted))
  } catch (error) {
    // 首次启动或已经退出时文件不存在是正常的“未登录”状态。
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null
    }
    throw error
  }
}

export async function clearRefreshCredential(): Promise<void> {
  try {
    await unlink(credentialPath())
  } catch (error) {
    // 清理操作保持幂等，便于退出、401 和启动恢复失败共用。
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      throw error
    }
  }
}

class CredentialStorageError extends Error {
  readonly name = "CredentialStorageError"
}
