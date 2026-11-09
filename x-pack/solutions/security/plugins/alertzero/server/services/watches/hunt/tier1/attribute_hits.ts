/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HUNT_EVIDENCE_FIELD_KEYS,
  HUNT_EVIDENCE_FIELDS_MAX_KEYS,
  HUNT_EVIDENCE_FIELD_VALUE_MAX,
  HUNT_MATCHED_IOCS_MAX,
  type HuntForThreatHit,
  type HuntIoc,
} from '@kbn/alertzero-common';

type HitMatched = NonNullable<HuntForThreatHit['matched']>;

/** ES hit plus `_source` for attribution; wire response drops source after matching. */
export interface HitDocument {
  id: string;
  index: string;
  timestamp?: string;
  source: Record<string, unknown>;
  /** Named-query matches from ES when Tier 1 clauses carry `_name`. */
  matched_queries?: string[];
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
 * Bounded evidence keys copied onto wire hits. Order is the priority when
 * capping at 8 keys per event. Host and user are separate top-level fields.
 */
export const EVIDENCE_SOURCE_FIELDS = HUNT_EVIDENCE_FIELD_KEYS;

/** Named Tier 1 clause: `ioc_<index>|<ecs.field>`. */
const NAMED_CLAUSE_RE = /^ioc_(\d+)\|(.+)$/;

/**
 * IOC types whose values name the same thing whatever their case. Hex digests are
 * case-insensitive as identifiers, and DNS names are case-insensitive by
 * definition, but the ECS fields holding both are `keyword`, so a report quoting
 * `ABC…` or `Example.COM` and an integration indexing `abc…` or `example.com`
 * name the same file and the same host without naming the same term.
 *
 * Exported because the query in `hunt_for_threat.ts` has to agree with attribution
 * here: a hit the search found and a hit attribution cannot explain is worse than
 * either behaviour on its own.
 */
export const CASE_INSENSITIVE_IOC_TYPES: ReadonlySet<string> = new Set(['hash', 'domain']);

/** Canonical form of an IOC value for comparison, applied to both sides of it. */
export const normalizeIocValue = (type: string, value: string): string =>
  CASE_INSENSITIVE_IOC_TYPES.has(type) ? value.toLowerCase() : value;

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
};

const firstStringValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const str = asString(item);
      if (str !== undefined) return str;
    }
    return undefined;
  }
  return asString(value);
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

interface IocFieldMatch {
  type: string;
  value: string;
  field: string;
}

/**
 * Every IOC that matches in `_source`. Used only when a hit has no
 * `matched_queries`; named clauses are authoritative when present.
 */
const matchIocs = (fields: Map<string, string[]>, iocs: HuntIoc[]): IocFieldMatch[] => {
  const matches: IocFieldMatch[] = [];
  for (const ioc of iocs) {
    const candidates = IOC_FIELDS_BY_TYPE[ioc.type] ?? [];
    const wanted = normalizeIocValue(ioc.type, ioc.value);
    for (const field of candidates) {
      const values = fields.get(field) ?? [];
      if (values.some((v) => normalizeIocValue(ioc.type, v) === wanted)) {
        matches.push({ type: ioc.type, value: ioc.value, field });
      }
    }
  }
  return matches;
};

const iocsFromMatchedQueries = (matchedQueries: string[], iocs: HuntIoc[]): IocFieldMatch[] => {
  const matches: IocFieldMatch[] = [];
  for (const name of matchedQueries) {
    const parsed = NAMED_CLAUSE_RE.exec(name);
    if (!parsed) continue;
    const ioc = iocs[Number(parsed[1])];
    if (!ioc) continue;
    matches.push({ type: ioc.type, value: ioc.value, field: parsed[2] });
  }
  return matches;
};

const copyEvidenceFields = (
  source: Record<string, unknown>
): Record<string, string> | undefined => {
  const fields: Record<string, string> = {};
  for (const key of EVIDENCE_SOURCE_FIELDS) {
    if (Object.keys(fields).length >= HUNT_EVIDENCE_FIELDS_MAX_KEYS) break;
    // Prefer a top-level dotted key when the projection stored it that way; else walk nested.
    const raw =
      key in source
        ? source[key]
        : key.split('.').reduce<unknown>((node, part) => {
            if (node == null || typeof node !== 'object' || Array.isArray(node)) return undefined;
            return (node as Record<string, unknown>)[part];
          }, source);
    const str = firstStringValue(raw);
    if (str === undefined) continue;
    fields[key] =
      str.length > HUNT_EVIDENCE_FIELD_VALUE_MAX
        ? str.slice(0, HUNT_EVIDENCE_FIELD_VALUE_MAX)
        : str;
  }
  return Object.keys(fields).length > 0 ? fields : undefined;
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
 *
 * When ES returns `matched_queries` for named Tier 1 clauses (`ioc_<i>|<field>`),
 * those are authoritative for `matched.iocs` / `matched.field`. Otherwise
 * every `_source` match is collected as a fallback. Either way the list is
 * capped at {@link HUNT_MATCHED_IOCS_MAX}, which is what both wire schemas allow.
 */
export const attributeHits = (
  docs: HitDocument[],
  iocs: HuntIoc[],
  techniques: string[]
): HuntForThreatHit[] =>
  docs.map(({ id, index, timestamp, source, matched_queries }) => {
    const fieldValues = collectFieldValues(source);
    const iocMatches = (
      matched_queries && matched_queries.length > 0
        ? iocsFromMatchedQueries(matched_queries, iocs)
        : matchIocs(fieldValues, iocs)
    ).slice(0, HUNT_MATCHED_IOCS_MAX);
    const techniqueMatch = matchTechnique(fieldValues, techniques);

    const host = fieldValues.get('host.name')?.[0];
    const user = fieldValues.get('user.name')?.[0];
    const evidence = copyEvidenceFields(source);

    const hit: HuntForThreatHit = {
      id,
      index,
      ...(timestamp ? { timestamp } : {}),
      ...(host ? { host } : {}),
      ...(user ? { user } : {}),
      ...(evidence ? { fields: evidence } : {}),
    };
    if (iocMatches.length === 0 && !techniqueMatch) return hit;

    const primary = iocMatches[0];
    const matched: HitMatched = {
      ...(primary
        ? {
            ioc: { type: primary.type, value: primary.value },
            field: primary.field,
            iocs: iocMatches,
          }
        : {}),
      ...(techniqueMatch
        ? {
            technique_id: techniqueMatch.technique_id,
            // Prefer the IOC field when both match; technique field otherwise.
            ...(primary ? {} : { field: techniqueMatch.field }),
          }
        : {}),
    };
    return { ...hit, matched };
  });

/**
 * Whether Tier 1 can turn this IOC into a query clause at all. Mirrors
 * `buildIocClauses`: a hash needs a length in `HASH_ALGO_BY_LENGTH`, every other
 * type needs at least one ECS field to search. The coordinator uses this to
 * decide whether a report's IOCs justify a broad Tier 1 scope; an IOC list made
 * only of values Tier 1 will drop must not send a hunt across every dataset to
 * search for nothing.
 *
 * Hash IOCs whose length is not 32/40/64 (md5/sha1/sha256) are not searchable.
 */
export const isTier1SearchableIoc = ({ type, value }: HuntIoc): boolean => {
  // `huntForThreat` trims every value and drops the blank ones before building any
  // clause; judge the same string, whatever the type.
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  return type === 'hash'
    ? HASH_ALGO_BY_LENGTH[trimmed.length] !== undefined
    : (IOC_FIELDS_BY_TYPE[type] ?? []).length > 0;
};
