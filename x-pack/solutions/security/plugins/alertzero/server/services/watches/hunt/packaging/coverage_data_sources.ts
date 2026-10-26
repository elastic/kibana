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
 * Dataset patterns for a subject with no hit events: the coordinator's `report_intent_targets`
 * (the datasets the report itself points at, already free of Tier 1 hit indices and the
 * process-bearing response-action streams), collapsed to dataset patterns. When the
 * coordinator named none, the executed queries' `FROM` is the next best evidence.
 */
export const reportIntentDataSources = ({
  reportIntentTargets,
  behaviors,
}: {
  reportIntentTargets: string[];
  behaviors: CoverageBehavior[];
}): string[] => {
  const fromTargets = uniqueSorted(reportIntentTargets.map(collapseToDataSourcePattern));
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
