/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntForThreatHit, HuntIoc } from '@kbn/alertzero-common';

type HitMatched = NonNullable<HuntForThreatHit['matched']>;

const IOC_FIELDS_BY_TYPE: Record<string, string[]> = {
  ip: [
    'source.ip',
    'destination.ip',
    'host.ip',
    'client.ip',
    'server.ip',
    'related.ip',
    'kubernetes.audit.sourceIPs',
  ],
  email: ['user.email', 'user.name', 'user.target.email', 'user.target.name', 'related.user'],
  domain: ['dns.question.name', 'destination.domain', 'url.domain', 'source.domain'],
  url: ['url.full', 'url.original'],
  hash: [
    'file.hash.md5',
    'file.hash.sha1',
    'file.hash.sha256',
    'process.hash.md5',
    'process.hash.sha1',
    'process.hash.sha256',
    'dll.hash.md5',
    'dll.hash.sha1',
    'dll.hash.sha256',
  ],
};

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
};

/** Keys the hit envelope adds beside `_source`; skipped only at the top level, since nested `id`s are real data (`threat.technique[].id`). */
const HIT_ENVELOPE_KEYS = new Set(['index', 'id', 'score', 'matched']);

/** Flatten nested `_source`-shaped hit fields into dotted paths (arrays of objects flattened per item). */
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
    if (prefix === '' && HIT_ENVELOPE_KEYS.has(key)) continue;
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
    for (const field of candidates) {
      const values = fields.get(field) ?? [];
      if (values.some((v) => v === ioc.value)) {
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
 * Attach `matched` to each Tier 1 hit by comparing the document to the
 * searched IOCs / technique ids. Prefer IOC when both match (IOC hunts are
 * the common path); technique alone still attributes alert hits.
 */
export const attributeHits = (
  hits: HuntForThreatHit[],
  iocs: HuntIoc[],
  techniques: string[]
): HuntForThreatHit[] =>
  hits.map((hit) => {
    const fields = collectFieldValues(hit as Record<string, unknown>);
    const iocMatch = matchIoc(fields, iocs);
    const techniqueMatch = matchTechnique(fields, techniques);
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
