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

/** Flatten nested `_source`-shaped hit fields into dotted paths (one level deep arrays flattened). */
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
    if (key === 'index' || key === 'id' || key === 'score' || key === 'matched') continue;
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

const techniqueIdsFromHit = (hit: HuntForThreatHit): string[] => {
  const raw = (hit as Record<string, unknown>)['kibana.alert.rule.threat.technique'];
  const ids: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === 'string' && value.length > 0) ids.push(value.toUpperCase());
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      const id = (value as Record<string, unknown>).id;
      if (typeof id === 'string' && id.length > 0) ids.push(id.toUpperCase());
    }
  };
  if (Array.isArray(raw)) {
    for (const entry of raw) push(entry);
  } else {
    push(raw);
  }
  // Flattened dotted form some responses use.
  const flatId = (hit as Record<string, unknown>)['kibana.alert.rule.threat.technique.id'];
  if (typeof flatId === 'string') ids.push(flatId.toUpperCase());
  if (Array.isArray(flatId)) {
    for (const entry of flatId) {
      if (typeof entry === 'string') ids.push(entry.toUpperCase());
    }
  }
  return [...new Set(ids)];
};

const matchTechnique = (
  hit: HuntForThreatHit,
  techniques: string[]
): { technique_id: string; field: string } | undefined => {
  if (techniques.length === 0) return undefined;
  const wanted = new Set(techniques.map((t) => t.toUpperCase()));
  for (const id of techniqueIdsFromHit(hit)) {
    if (wanted.has(id)) {
      return {
        technique_id: id,
        field: 'kibana.alert.rule.threat.technique.id',
      };
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
    const techniqueMatch = matchTechnique(hit, techniques);
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
