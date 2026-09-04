/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface UrlGroupingConfig {
  depth?: number;
  rules?: string[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_ID_RE = /^[0-9a-f]{16,}$/i;
const NUM_ID_RE = /^\d{4,}$/;

export const looksLikeId = (segment: string): boolean =>
  Boolean(segment) && (UUID_RE.test(segment) || HEX_ID_RE.test(segment) || NUM_ID_RE.test(segment));

const applyGlobRule = (path: string, pattern: string): string | null => {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length === 0 || pathParts.length < patternParts.length) {
    return null;
  }
  const out: string[] = [];
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] === '*') {
      out.push('*');
    } else if (patternParts[i] === pathParts[i]) {
      out.push(pathParts[i]);
    } else {
      return null;
    }
  }
  for (let i = patternParts.length; i < pathParts.length; i++) {
    out.push(looksLikeId(pathParts[i]) ? '*' : pathParts[i]);
  }
  return `/${out.join('/')}`;
};

/** Collapse high-cardinality URL paths (IDs, depth cap, glob rules). */
export const groupUrlPath = (path: string, grouping: UrlGroupingConfig = {}): string => {
  if (!path) {
    return path;
  }
  let normalized = path;
  try {
    if (path.includes('://')) {
      normalized = new URL(path).pathname;
    }
  } catch {
    normalized = path.split('?')[0] ?? path;
  }
  const hash = normalized.indexOf('#');
  if (hash >= 0) {
    const frag = normalized.slice(hash + 1);
    if (frag.startsWith('/')) {
      normalized = frag.split('?')[0] ?? frag;
    }
  }
  const q = normalized.indexOf('?');
  if (q >= 0) {
    normalized = normalized.slice(0, q);
  }
  if (!normalized.startsWith('/')) {
    return normalized;
  }

  for (const rule of grouping.rules ?? []) {
    if (!rule) {
      continue;
    }
    const grouped = applyGlobRule(normalized, rule);
    if (grouped) {
      return grouped;
    }
  }

  const mapped = normalized
    .split('/')
    .filter(Boolean)
    .map((seg) => (looksLikeId(seg) ? ':id' : seg));
  const { depth } = grouping;
  if (typeof depth === 'number' && depth > 0 && mapped.length > depth) {
    return `/${mapped.slice(0, depth).join('/')}/*`;
  }
  return `/${mapped.join('/')}`;
};

export const parseGroupingRules = (raw: string): string[] =>
  raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 32);

export const parseIgnoreUrls = (raw: string): string[] =>
  raw
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 64);
