/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntForThreatHit, HuntIoc } from '@kbn/alertzero-common';

type HitMatched = NonNullable<HuntForThreatHit['matched']>;

/** ES hit plus `_source` for attribution; wire response drops source after matching. */
export interface HitDocument {
  id: string;
  index: string;
  timestamp?: string;
  source: Record<string, unknown>;
}

const HASH_FIELD_PREFIXES = ['file', 'process', 'dll'] as const;

/** Hash length disambiguates the algo for query-building (`hunt_for_threat.ts`); attribution here checks all algos regardless of length. */
export const HASH_ALGO_BY_LENGTH: Record<number, 'md5' | 'sha1' | 'sha256'> = {
  32: 'md5',
  40: 'sha1',
  64: 'sha256',
};

export const hashFieldsForAlgo = (algo: string): string[] =>
  HASH_FIELD_PREFIXES.map((prefix) => `${prefix}.hash.${algo}`);

/** ECS fields an IOC value might land in; shared by hit attribution here and query-building in `hunt_for_threat.ts`. */
export const IOC_FIELDS_BY_TYPE: Record<string, string[]> = {
  ip: [
    'source.ip',
    'destination.ip',
    'host.ip',
    'client.ip',
    'server.ip',
    // ECS related + Kubernetes audit commonly stamp IPs here when `source.ip`
    // is absent (e.g. Technology Watch AWS pack).
    'related.ip',
    'kubernetes.audit.sourceIPs',
  ],
  email: ['user.email', 'user.name', 'user.target.email', 'user.target.name', 'related.user'],
  domain: ['dns.question.name', 'destination.domain', 'url.domain', 'source.domain'],
  url: ['url.full', 'url.original'],
  hash: Object.values(HASH_ALGO_BY_LENGTH).flatMap(hashFieldsForAlgo),
};

/**
 * Canonical form of an IOC value for comparison. Hex digests are
 * case-insensitive as identifiers but ECS hash fields are `keyword`, so a report
 * quoting `ABC…` and an integration indexing `abc…` name the same file and not
 * the same term. Applied to both sides — the query built in `hunt_for_threat.ts`
 * and the `_source` comparison in `matchIoc` — so a hit that the search found is
 * a hit attribution can also explain.
 */
export const normalizeIocValue = (type: string, value: string): string =>
  type === 'hash' ? value.toLowerCase() : value;

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
};

/** Flatten nested `_source`-shaped fields into dotted paths (arrays of objects flattened per item). */
const collectFieldValues = (
  source: Record<string, unknown>,
  prefix = ''
): Map<string, string[]> => {
  const out = new Map<string, string[]>();
  const add = (path: string, value: unknown) => {
    const str = asString(value);
    if (str === undefined) return;
    const existing = out.get(path) ?? [];
    existing.push(str);
    out.set(path, existing);
  };

  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item != null && typeof item === 'object' && !Array.isArray(item)) {
          for (const [nestedPath, nestedVals] of collectFieldValues(
            item as Record<string, unknown>,
            path
          )) {
            const existing = out.get(nestedPath) ?? [];
            out.set(nestedPath, [...existing, ...nestedVals]);
          }
        } else {
          add(path, item);
        }
      }
      continue;
    }
    if (typeof value === 'object') {
      for (const [nestedPath, nestedVals] of collectFieldValues(
        value as Record<string, unknown>,
        path
      )) {
        const existing = out.get(nestedPath) ?? [];
        out.set(nestedPath, [...existing, ...nestedVals]);
      }
      continue;
    }
    add(path, value);
  }
  return out;
};

const matchIoc = (
  fields: Map<string, string[]>,
  iocs: HuntIoc[]
): { ioc: HuntIoc; field: string } | undefined => {
  for (const ioc of iocs) {
    const candidates = IOC_FIELDS_BY_TYPE[ioc.type] ?? [];
    const wanted = normalizeIocValue(ioc.type, ioc.value);
    for (const field of candidates) {
      const values = fields.get(field) ?? [];
      if (values.some((v) => normalizeIocValue(ioc.type, v) === wanted)) {
        return { ioc, field };
      }
    }
  }
  return undefined;
};

/**
 * Where an alert carries its ATT&CK ids. Alerts store `kibana.alert.rule.threat`
 * as a dotted top-level key whose value is `[{ tactic, technique: [{ id,
 * subtechnique: [{ id }] }] }]`; `collectFieldValues` flattens that (and any
 * already-dotted variant) to these paths. A sub-technique such as `T1078.004`
 * lives on the `subtechnique.id` path, never on `technique.id`.
 */
export const ALERT_TECHNIQUE_ID_FIELDS = [
  'kibana.alert.rule.threat.technique.id',
  'kibana.alert.rule.threat.technique.subtechnique.id',
] as const;

const matchTechnique = (
  fields: Map<string, string[]>,
  techniques: string[]
): { technique_id: string; field: string } | undefined => {
  if (techniques.length === 0) return undefined;
  const wanted = new Set(techniques.map((t) => t.toUpperCase()));
  for (const field of ALERT_TECHNIQUE_ID_FIELDS) {
    for (const value of fields.get(field) ?? []) {
      const id = value.toUpperCase();
      if (wanted.has(id)) {
        return { technique_id: id, field };
      }
    }
  }
  return undefined;
};

/**
 * Build slim wire hits (`id` / `index` / `timestamp` / optional `matched`) by
 * comparing each document `_source` to the searched IOCs / technique ids.
 * Prefer IOC when both match (IOC hunts are the common path); technique alone
 * still attributes alert hits. `matched` is required for SSE technique scoping
 * and event attribution.
 */
export const attributeHits = (
  docs: HitDocument[],
  iocs: HuntIoc[],
  techniques: string[]
): HuntForThreatHit[] =>
  docs.map(({ id, index, timestamp, source }) => {
    const fields = collectFieldValues(source);
    const iocMatch = matchIoc(fields, iocs);
    const techniqueMatch = matchTechnique(fields, techniques);

    const hit: HuntForThreatHit = {
      id,
      index,
      ...(timestamp ? { timestamp } : {}),
    };
    if (!iocMatch && !techniqueMatch) return hit;

    const matched: HitMatched = {
      ...(iocMatch
        ? { ioc: { type: iocMatch.ioc.type, value: iocMatch.ioc.value }, field: iocMatch.field }
        : {}),
      ...(techniqueMatch
        ? {
            technique_id: techniqueMatch.technique_id,
            // Prefer the IOC field when both match; technique field otherwise.
            ...(iocMatch ? {} : { field: techniqueMatch.field }),
          }
        : {}),
    };
    return { ...hit, matched };
  });
