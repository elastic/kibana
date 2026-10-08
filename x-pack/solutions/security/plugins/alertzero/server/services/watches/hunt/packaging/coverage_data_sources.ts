/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collapseToDataSourcePattern } from '../common/classify_actionable_indices';
import { HUNT_VENDOR_ALIASES, normalizeVendorToken } from '../common/match_hunt_datasets';
import type { CoverageBehavior } from './types';

/** Most dataset patterns one coverage KI carries; the CE array cap is 100. */
const MAX_DATA_SOURCES = 100;

const uniqueSorted = (values: Array<string | undefined>): string[] =>
  [...new Set(values.filter((value): value is string => value !== undefined))]
    .sort()
    .slice(0, MAX_DATA_SOURCES);

/** `logs-endpoint` for `logs-endpoint.alerts.00e5ea78.2026.10.08*` or `logs-endpoint.*`. */
const vendorKey = (pattern: string): string | undefined =>
  /^([a-z]+)-([^.\-*]+)/.exec(pattern)?.slice(1, 3).join('-');

/** Drops `//` comment lines; Tier 2's header says "Generated from hunt.…", which is not a FROM. */
export const stripEsqlComments = (esql: string): string =>
  esql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n');

/**
 * Dataset patterns from the source events a hit landed in. Alert indices never count: an
 * existing alert means a rule already covers the behavior, and these KIs ask for a new one.
 */
export const eventDataSources = (indices: string[]): string[] =>
  uniqueSorted(indices.map(collapseToDataSourcePattern));

/**
 * The index patterns a `FROM` command names, collapsed to dataset patterns. `METADATA` and the
 * rest of the pipeline are ignored.
 */
export const fromDataSources = (esql: string): string[] => {
  const match = /^\s*FROM\s+([^|\n]+)/im.exec(stripEsqlComments(esql));
  if (!match) return [];
  const sources = match[1]
    .replace(/\bMETADATA\b.*$/i, '')
    .split(',')
    .map((source) => source.trim())
    .filter((source) => source !== '');
  return uniqueSorted(sources.map(collapseToDataSourcePattern));
};

/**
 * Report-intent dataset patterns for a run with no source events: the Tier 2 allowlist minus
 * the process-bearing streams that were added for response actions. The allowlist is
 * `report match + Tier 1 hits + actionable_indices`, so taking the set difference leaves what
 * the report is about. When the allowlist was already bounded to vendor wildcards
 * (`logs-endpoint.*`) a plain difference cannot remove the padding, so a target is also
 * dropped when its `<type>-<vendor>` prefix is one an actionable index carries.
 */
export const reportIntentDataSources = ({
  tier2Targets,
  actionableIndices,
  behaviors,
}: {
  tier2Targets: string[];
  actionableIndices: string[];
  behaviors: CoverageBehavior[];
}): string[] => {
  const actionable = new Set(actionableIndices);
  const actionableVendors = new Set(
    actionableIndices.map(vendorKey).filter((key): key is string => key !== undefined)
  );
  const remaining = tier2Targets.filter((target) => {
    if (actionable.has(target)) return false;
    const key = vendorKey(target);
    return key === undefined || !actionableVendors.has(key);
  });
  const fromTargets = uniqueSorted(remaining.map(collapseToDataSourcePattern));
  if (fromTargets.length > 0) return fromTargets;
  return uniqueSorted(behaviors.flatMap((behavior) => fromDataSources(behavior.validatedEsql)));
};

/**
 * Soft dataset hint from the report's vendor or product when nothing else names one:
 * `logs-{canonicalVendor}.*`, with the hunt's vendor aliases applied (Amazon becomes `aws`).
 */
export const vendorFallbackDataSources = ({
  vendor,
  product,
}: {
  vendor?: string;
  product?: string;
}): string[] => {
  const patterns = [vendor, product].flatMap((value) => {
    if (!value) return [];
    const token = normalizeVendorToken(value);
    if (token === '') return [];
    return [`logs-${HUNT_VENDOR_ALIASES[token]?.[0] ?? token}.*`];
  });
  return uniqueSorted(patterns);
};
