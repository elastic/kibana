/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRecord, isString } from './type_guards';

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(isString);
};

/**
 * Build ECS `related.*` from host/user (and optional extra IPs).
 * Preserves any existing related values already on the doc.
 */
export const relatedFields = (
  host?: Record<string, unknown> | null,
  user?: Record<string, unknown> | null,
  extraIps?: string[]
): { related: Record<string, string[]> } => {
  const users: string[] = [];
  const hosts: string[] = [];
  const ips: string[] = [];

  if (user) {
    if (isString(user.name)) users.push(user.name);
    if (isString(user.email) && user.email !== user.name) users.push(user.email);
  }
  if (host) {
    if (isString(host.name)) hosts.push(host.name);
    if (isString(host.hostname) && host.hostname !== host.name) hosts.push(host.hostname);
    if (Array.isArray(host.ip)) ips.push(...asStringArray(host.ip));
    else if (isString(host.ip)) ips.push(host.ip);
  }
  if (extraIps) ips.push(...extraIps.filter(isString));

  const related: Record<string, string[]> = {};
  if (users.length) related.user = [...new Set(users)];
  if (hosts.length) related.hosts = [...new Set(hosts)];
  if (ips.length) related.ip = [...new Set(ips)];
  return { related };
};

const mergeRelated = (
  existing: unknown,
  next: Record<string, string[]>
): Record<string, string[]> => {
  const base = isRecord(existing) ? existing : {};
  const out: Record<string, string[]> = {};
  for (const key of ['user', 'hosts', 'ip'] as const) {
    const merged = [...new Set([...asStringArray(base[key]), ...(next[key] ?? [])])];
    if (merged.length > 0) out[key] = merged;
  }
  return out;
};

/**
 * Enrich a source/alert doc for graph views:
 * - merge `related.*`
 * - auto-fill `host.target` / `user.target` when missing
 *   (user+host → host.target; user-only → user.target; host-only → skip)
 *
 * Does not strip existing `*.entity.relationships.*` from ported events.
 */
export const enrichDocForGraph = (
  doc: Record<string, unknown>,
  options: { extraIps?: string[] } = {}
): void => {
  const host = isRecord(doc.host) ? doc.host : null;
  const user = isRecord(doc.user) ? doc.user : null;

  const { related } = relatedFields(host, user, options.extraIps);
  doc.related = mergeRelated(doc.related, related);

  const hasExplicitTarget = doc['host.target'] != null || doc['user.target'] != null;
  if (hasExplicitTarget) return;

  if (user && host) {
    doc['host.target'] = { ...host };
  } else if (user && !host) {
    doc['user.target'] = { ...user };
  }
};
