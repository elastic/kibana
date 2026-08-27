/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BreakdownCount,
  DetonationSeverity,
  DetonationSummary,
  MalwareFamilyCount,
  ProtectionEventCode,
} from '../../common/detonate';
import {
  collectMalwareCategories,
  collectMalwareFamilies,
  DETONATE_PROTECTION_EVENT_CODES,
  DETONATION_SEVERITY_ORDER,
  parseMalwareSignature,
} from '../../common/detonate';
import { osFamilyLabel } from './labels';

/** ES|QL returns a scalar for single values, an array for multivalues and null for missing ones. */
export const toArray = (value: unknown): string[] => {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  return typeof value === 'string' ? [value] : [];
};

const toStringOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const toCount = (value: unknown): number => (typeof value === 'number' ? value : 0);

const PROTECTION_CODES = new Set<string>(DETONATE_PROTECTION_EVENT_CODES);

/** Keeps protections in a stable, meaningful order rather than the order ES|QL happened to return. */
export const toProtections = (eventCodes: unknown): ProtectionEventCode[] => {
  const present = new Set(toArray(eventCodes).filter((code) => PROTECTION_CODES.has(code)));
  return DETONATE_PROTECTION_EVENT_CODES.filter((code) => present.has(code));
};

const SEVERITY_RANK = new Map<string, number>(
  DETONATION_SEVERITY_ORDER.map((severity, index) => [severity, index])
);

/**
 * Highest detection-rule severity, or `null` when the detonation produced only endpoint protection
 * alerts. Endpoint protections carry no rule severity, which is what made the original dashboard's
 * multi-valued severity column read as "all the severities".
 */
export const toHighestSeverity = (severities: unknown): DetonationSeverity | null => {
  const ranked = toArray(severities)
    .map((severity) => ({ severity, rank: SEVERITY_RANK.get(severity) }))
    .filter((entry): entry is { severity: string; rank: number } => entry.rank !== undefined);

  if (ranked.length === 0) {
    return null;
  }

  return ranked.reduce((highest, entry) => (entry.rank > highest.rank ? entry : highest))
    .severity as DetonationSeverity;
};

/** Display string only; filtering matches the raw `osFamily` the chart breaks down. */
const toPlatform = (osFamily: string | null, architecture: string | null): string => {
  if (!osFamily && !architecture) {
    return '—';
  }
  return `${osFamily ? osFamilyLabel(osFamily) : '?'}/${architecture ?? '?'}`;
};

/** Maps one raw ES|QL row from `getDetonationsQuery` onto the row model used by the table. */
export const toDetonationSummary = (record: Record<string, unknown>): DetonationSummary => {
  const ruleNames = toArray(record.ruleNames);
  const osFamily = toStringOrNull(record.osFamily);
  const architecture = toStringOrNull(record.architecture);

  return {
    taskId: toStringOrNull(record.taskId) ?? '',
    timestamp: toStringOrNull(record.timestamp),
    sampleHash: toStringOrNull(record.sampleHash),
    sampleExtension: toStringOrNull(record.sampleExtension),
    platform: toPlatform(osFamily, architecture),
    osFamily,
    architecture,
    agentId: toStringOrNull(record.agentId),
    agentVersion: toStringOrNull(record.agentVersion),
    endpointAlertsCount: toCount(record.endpointAlertsCount),
    detectionAlertsCount: toCount(record.detectionAlertsCount),
    families: collectMalwareFamilies(ruleNames),
    categories: collectMalwareCategories(ruleNames),
    protections: toProtections(record.eventCodes),
    highestSeverity: toHighestSeverity(record.severities),
    source: toStringOrNull(record.source),
    tags: toArray(record.tags),
  };
};

/**
 * Folds per-rule-name counts into per-family counts, dropping rule names that name no family.
 * Doing this client-side keeps the signature parsing in one unit-tested place.
 */
export const toFamilyCounts = (
  records: Array<Record<string, unknown>>,
  limit: number
): MalwareFamilyCount[] => {
  const totals = new Map<string, MalwareFamilyCount>();

  for (const record of records) {
    const signature = parseMalwareSignature(toStringOrNull(record.ruleName));

    if (signature) {
      const existing = totals.get(signature.family);
      const count = toCount(record.count);

      if (existing) {
        existing.count += count;
      } else {
        totals.set(signature.family, {
          family: signature.family,
          category: signature.category,
          count,
        });
      }
    }
  }

  return [...totals.values()].sort((a, b) => b.count - a.count).slice(0, limit);
};

/** Maps the rows of a `STATS count = ... BY <field>` query onto breakdown chart bars. */
export const toBreakdownCounts = (
  records: Array<Record<string, unknown>>,
  keyField: string
): BreakdownCount[] =>
  records
    .map((record) => ({ key: toStringOrNull(record[keyField]), count: toCount(record.count) }))
    .filter((entry): entry is BreakdownCount => entry.key !== null)
    .sort((a, b) => b.count - a.count);

/**
 * Filters for the page.
 *
 * All of them are pushed into ES|QL, so the row cap applies to matches rather than to the most
 * recent detonations, and the breakdown charts describe the same detonations as the table. Each
 * chart leaves out the filter it breaks down, so its bars keep offering the other values.
 */
export interface DetonationFilters {
  /** Hides detonations that produced neither endpoint nor detection alerts. On by default. */
  onlyWithAlerts: boolean;
  /** Keeps only detonations whose signatures named a malware family. On by default. */
  onlyNamedThreats: boolean;
  /** Case-insensitive substring match against the sample hash. */
  hash: string;
  families: string[];
  protections: ProtectionEventCode[];
  /** Matched against `osFamily`, the dimension the platform chart breaks down. */
  platforms: string[];
  sources: string[];
}

export const EMPTY_DETONATION_FILTERS: DetonationFilters = {
  onlyWithAlerts: true,
  onlyNamedThreats: true,
  hash: '',
  families: [],
  protections: [],
  platforms: [],
  sources: [],
};

/** True when no filter would remove a row, used to hide the "clear all" affordance. */
export const hasActiveFilters = (filters: DetonationFilters): boolean =>
  filters.hash.trim().length > 0 ||
  filters.families.length > 0 ||
  filters.protections.length > 0 ||
  filters.platforms.length > 0 ||
  filters.sources.length > 0;

/**
 * Signature rule names grouped by the family they name, so a family selection can be pushed into
 * ES|QL as exact matches on rule names. One family spans several rule names, because the same
 * malware is signed per operating system.
 *
 * Flattening the whole map gives the rule names that name any family at all, which is how
 * "named threats only" reaches ES|QL without duplicating the signature parser in the query.
 */
export const toRuleNamesByFamily = (
  records: Array<Record<string, unknown>>
): Map<string, string[]> => {
  const byFamily = new Map<string, string[]>();

  for (const record of records) {
    const ruleName = toStringOrNull(record.ruleName);
    const signature = ruleName ? parseMalwareSignature(ruleName) : null;

    if (ruleName && signature) {
      const existing = byFamily.get(signature.family);
      if (existing) {
        existing.push(ruleName);
      } else {
        byFamily.set(signature.family, [ruleName]);
      }
    }
  }

  return byFamily;
};
