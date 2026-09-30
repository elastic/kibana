/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  INTERNAL_DATASET_PREFIXES,
  parseDataStreamName,
  vendorToken,
} from './discover_hunt_datasets';
import { fitsRequestPath, vendorWildcards } from './scope_bounds';

/**
 * The mapping fields that let a hit become a Defend response action: a process identity
 * a kill-process / suspend-process action can target. Either one is enough.
 */
const ACTIONABLE_FIELDS = ['process.entity_id', 'process.pid'];

const DATA_STREAM_BACKING_PREFIX = '.ds-';

/** `-2026.09.30-000001` (or a bare `-000001`) closing a backing index name. */
const BACKING_SUFFIX = /(-\d{4}\.\d{2}\.\d{2})?-\d{6}$/;

/**
 * Collapses a concrete index name to a `*`-suffixed pattern: a data stream backing index
 * (`.ds-logs-okta.system-default-2026.09.30-000001`) becomes its stream
 * (`logs-okta.system-default*`), any other index becomes itself with a `*`
 * (`logs-endpoint.events.e8c68216.2026.09.29*`). Every list handed to Tier 2 or packaging
 * carries the `*` because `buildMatchesRequired` and `isIndexPatternAllowed` glob against
 * `.ds-`-stripped names, and a pattern without one never matches a backing index.
 */
export const collapseIndexName = (name: string): string =>
  name.startsWith(DATA_STREAM_BACKING_PREFIX)
    ? `${name.slice(DATA_STREAM_BACKING_PREFIX.length).replace(BACKING_SUFFIX, '')}*`
    : `${name}*`;

const withoutWildcard = (pattern: string): string => pattern.replace(/\*$/, '');

const isInternalPattern = (pattern: string): boolean => {
  const parsed = parseDataStreamName(withoutWildcard(pattern));
  return (
    parsed !== undefined &&
    INTERNAL_DATASET_PREFIXES.some((prefix) => parsed.dataset.startsWith(prefix))
  );
};

/**
 * `logs-<dataset>-*` for a `{type}-{dataset}-{namespace}` name. Beats-style names
 * (`filebeat-8.15.0`, `winlogbeat-2026.09.30`) have no dataset segment, so they collapse to
 * `<first segment>-*`, which is the universe pattern they came from.
 */
const toDatasetPattern = (pattern: string): string => {
  const name = withoutWildcard(pattern);
  const parsed = parseDataStreamName(name);
  return parsed ? `${parsed.type}-${parsed.dataset}-*` : `${name.split('-')[0]}-*`;
};

const toVendorPatterns = (pattern: string): string[] => {
  const name = withoutWildcard(pattern);
  const parsed = parseDataStreamName(name);
  return parsed
    ? vendorWildcards([{ index_pattern: name, vendor: vendorToken(parsed.dataset) }])
    : [`${name.split('-')[0]}-*`];
};

const uniqSorted = (values: string[]): string[] => Array.from(new Set(values)).sort();

/**
 * Names the indices where a hit can become a Defend response action, from what the
 * customer's mappings say rather than a seed list: every index in the universe whose
 * mapping carries `process.entity_id` or `process.pid`. Returned as `*`-suffixed
 * stream / index patterns, agent-internal datasets dropped. This is a mapping
 * classifier, not an enrollment check: whether a Fleet agent owns the host is decided
 * later, at packaging.
 *
 * A list that does not fit the request path collapses to one pattern per dataset, then to
 * one wildcard pair per vendor, and reads `degraded`. Any error is logged once and
 * returns `{ patterns: [], degraded: true }`; the classifier never blocks a hunt.
 */
export const classifyActionableIndices = async ({
  esClient,
  indexPatterns,
  logger,
}: {
  esClient: ElasticsearchClient;
  /** The hunt universe, exclusions included; Elasticsearch honours them in the request. */
  indexPatterns: string[];
  logger?: Logger;
}): Promise<{ patterns: string[]; degraded: boolean }> => {
  const named = new Set<string>();
  try {
    const response = await esClient.fieldCaps({
      index: indexPatterns,
      fields: ACTIONABLE_FIELDS,
      ignore_unavailable: true,
      allow_no_indices: true,
      expand_wildcards: 'open',
    });
    // Per type, `indices` is present only when the field is not mapped in every index of
    // the request. Absent means all of `response.indices`.
    const allIndices = [response.indices ?? []].flat();
    for (const typeCaps of Object.values(response.fields ?? {})) {
      for (const capability of Object.values(typeCaps)) {
        const listed = capability.indices === undefined ? allIndices : [capability.indices].flat();
        listed.forEach((name) => named.add(name));
      }
    }
  } catch (err) {
    logger?.warn(
      `Actionable index classification failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return { patterns: [], degraded: true };
  }

  const patterns = uniqSorted(Array.from(named).map(collapseIndexName)).filter(
    (pattern) => !isInternalPattern(pattern)
  );
  if (fitsRequestPath(patterns)) return { patterns, degraded: false };

  const perDataset = uniqSorted(patterns.map(toDatasetPattern));
  const collapsed = fitsRequestPath(perDataset)
    ? perDataset
    : uniqSorted(patterns.flatMap(toVendorPatterns));
  logger?.warn(
    `Actionable indices named ${patterns.length} pattern(s), more than a request may carry; collapsed to ${collapsed.length}`
  );
  return { patterns: collapsed, degraded: true };
};
