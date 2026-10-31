import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const encryptedPrefix = "healix:v1:";

function getEncryptionKey() {
  const secret = process.env.PROJECT_CREDENTIALS_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Set PROJECT_CREDENTIALS_ENCRYPTION_KEY or AUTH_SECRET before saving project credentials.");
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptProjectSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${encryptedPrefix}${Buffer.concat([iv, tag, encrypted]).toString("base64url")}`;
}

export function decryptProjectSecret(value: string) {
  if (!value.startsWith(encryptedPrefix)) return value;

  const payload = Buffer.from(value.slice(encryptedPrefix.length), "base64url");
  if (payload.length < 29) {
    throw new Error("Stored project credential has an invalid encrypted payload.");
  }

  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
