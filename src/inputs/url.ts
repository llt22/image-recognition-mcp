import { isIP } from "node:net";
import type { ResolvedImage } from "./types.js";

export function looksLikeUrl(input: string): boolean {
  return /^https?:\/\//i.test(input);
}

export function fromUrl(url: string): ResolvedImage {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid image URL: ${url.slice(0, 80)}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Unsupported image URL protocol: ${parsed.protocol}`);
  }
  if (parsed.username || parsed.password) {
    throw new Error("Image URL must not include credentials.");
  }
  if (isBlockedHost(parsed.hostname)) {
    throw new Error(`Image URL host is not allowed: ${parsed.hostname}`);
  }

  return { kind: "url", url: parsed.toString() };
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
  if (host === "localhost" || host.endsWith(".localhost")) return true;

  const ipVersion = isIP(host);
  if (ipVersion === 4) return isBlockedIpv4(host);
  if (ipVersion === 6) return isBlockedIpv6(host);
  return false;
}

function isBlockedIpv4(host: string): boolean {
  const parts = host.split(".").map((part) => Number(part));
  const [first, second] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isBlockedIpv6(host: string): boolean {
  return (
    host === "::" ||
    host === "::1" ||
    host === "0:0:0:0:0:0:0:1" ||
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host.startsWith("fe8") ||
    host.startsWith("fe9") ||
    host.startsWith("fea") ||
    host.startsWith("feb") ||
    /^::ffff:(?:10|127|192\.168|172\.(?:1[6-9]|2\d|3[01])|169\.254)\./.test(host)
  );
}
