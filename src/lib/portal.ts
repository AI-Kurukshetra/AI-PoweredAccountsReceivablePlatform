import { randomUUID } from "crypto";

export function buildPortalToken() {
  return `${randomUUID().replaceAll("-", "")}${randomUUID().slice(0, 8)}`;
}

export function getPortalBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function buildPortalUrl(token: string) {
  return `${getPortalBaseUrl()}/portal/${token}`;
}
