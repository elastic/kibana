/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reads a field from a hit whether `_source` came back flattened (alerts store
 * `kibana.alert.*` as dotted keys) or nested (raw telemetry stores `host.name`
 * as `{ host: { name } }`).
 */
const asNestedString = (src: Record<string, unknown>, path: string): string | undefined => {
  const parts = path.split('.');
  let cur: unknown = src;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object' || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === 'string' ? cur : undefined;
};

const readField = (src: Record<string, unknown>, path: string): string | undefined => {
  const flat = src[path];
  return typeof flat === 'string' ? flat : asNestedString(src, path);
};

/**
 * Length the Tier 2 request schema declares for a `sample_events` item. The
 * coordinator calls `huntBehavior` in-process, where no request validation runs,
 * so the bound has to hold at the source: a document with a very long
 * `event.action` or rule name would otherwise reach the generation prompt in
 * full and inflate the token request.
 */
const MAX_SUMMARY_CHARS = 2048;

/**
 * One-line digest of a document for Tier 2 LLM grounding (`sample_events`).
 * Built from `_source` before Tier 1 slims wire hits to id/index/timestamp/matched.
 */
export const summarizeHit = (hit: {
  index: string;
  id: string;
  source?: Record<string, unknown>;
}): string => {
  const parts: string[] = [];
  const src = hit.source ?? {};
  const ruleName = readField(src, 'kibana.alert.rule.name');
  if (ruleName) parts.push(`rule="${ruleName}"`);
  const dataset = readField(src, 'event.dataset') ?? readField(src, 'data_stream.dataset');
  if (dataset) parts.push(`dataset=${dataset}`);
  const action = readField(src, 'event.action');
  if (action) parts.push(`action=${action}`);
  const provider = readField(src, 'event.provider');
  if (provider) parts.push(`provider=${provider}`);
  const host = readField(src, 'host.name');
  if (host) parts.push(`host=${host}`);
  const user = readField(src, 'user.name');
  if (user) parts.push(`user=${user}`);
  const sourceIp = readField(src, 'source.ip');
  if (sourceIp) parts.push(`src=${sourceIp}`);
  const destinationIp = readField(src, 'destination.ip');
  if (destinationIp) parts.push(`dst=${destinationIp}`);
  const summary = parts.length > 0 ? parts.join(' ') : `_index=${hit.index} _id=${hit.id}`;
  return summary.slice(0, MAX_SUMMARY_CHARS);
};
