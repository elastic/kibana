/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { listSearchSources } from '@kbn/agent-builder-genai-utils';

export interface DiscoveredDataset {
  /** Searchable glob for Tier 1/2, e.g. 'logs-okta.system-*' */
  index_pattern: string;
  /** e.g. 'okta.system' */
  dataset: string;
  /** dataset's vendor token: the segment before the first '.', e.g. 'okta'; whole dataset when it has no '.' */
  vendor: string;
  /** backing data stream names that produced this entry, e.g. ['logs-okta.system-default'] */
  data_streams: string[];
}

export const HUNT_DISCOVERY_PATTERN = 'logs-*';

/** Agent-internal datasets never worth hunting; dropped from discovery. */
export const INTERNAL_DATASET_PREFIXES = ['elastic_agent', 'fleet_server'];

/** `_resolve/index` caps each result type; 500 covers any realistic Fleet deployment. */
const DISCOVERY_PER_TYPE_LIMIT = 500;

/**
 * Splits a data stream name into its `{type}-{dataset}-{namespace}` parts: type
 * is the segment before the first '-', namespace the segment after the last '-',
 * dataset everything between. Returns undefined for names with fewer than two
 * '-' since they cannot be a data stream name.
 *
 * Limitation: a namespace containing '-' (e.g. `prod-eu`) is ambiguous with a
 * dataset containing '-', and there is no way to tell them apart from the name
 * alone. This parser always takes the shortest namespace, so
 * `logs-cisco_asa.log-prod-eu` reads as dataset `cisco_asa.log-prod`,
 * namespace `eu`. The resulting `index_pattern` still matches the stream.
 */
export const parseDataStreamName = (
  name: string
): { type: string; dataset: string; namespace: string } | undefined => {
  const firstDash = name.indexOf('-');
  const lastDash = name.lastIndexOf('-');
  if (firstDash === -1 || lastDash === firstDash) return undefined;

  const type = name.slice(0, firstDash);
  const dataset = name.slice(firstDash + 1, lastDash);
  const namespace = name.slice(lastDash + 1);
  if (type === '' || dataset === '' || namespace === '') return undefined;

  return { type, dataset, namespace };
};

const vendorToken = (dataset: string): string => {
  const dot = dataset.indexOf('.');
  return dot === -1 ? dataset : dataset.slice(0, dot);
};

const isInternalDataset = (dataset: string): boolean =>
  INTERNAL_DATASET_PREFIXES.some((prefix) => dataset.startsWith(prefix));

/**
 * Discovers the datasets actually present in the space by listing the data
 * streams matching `pattern` and collapsing them across namespaces. Each entry
 * is one `{type}-{dataset}-*` glob a hunt can search, sorted by pattern.
 * Agent-internal datasets are dropped. Errors from Elasticsearch are logged
 * and rethrown so the caller decides how to fail.
 */
export const discoverHuntDatasets = async ({
  esClient,
  pattern = HUNT_DISCOVERY_PATTERN,
  logger,
}: {
  esClient: ElasticsearchClient;
  pattern?: string;
  logger?: Logger;
}): Promise<DiscoveredDataset[]> => {
  let dataStreamNames: string[];
  try {
    const sources = await listSearchSources({
      esClient,
      pattern,
      perTypeLimit: DISCOVERY_PER_TYPE_LIMIT,
      includeHidden: false,
    });
    dataStreamNames = sources.data_streams.map((stream) => stream.name);
  } catch (err) {
    logger?.warn(
      `Hunt dataset discovery failed for pattern "${pattern}": ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    throw err;
  }

  const byPattern = new Map<string, DiscoveredDataset>();
  for (const name of dataStreamNames) {
    const parsed = parseDataStreamName(name);
    if (!parsed || isInternalDataset(parsed.dataset)) continue;

    const indexPattern = `${parsed.type}-${parsed.dataset}-*`;
    const existing = byPattern.get(indexPattern);
    if (existing) {
      if (!existing.data_streams.includes(name)) existing.data_streams.push(name);
      continue;
    }
    byPattern.set(indexPattern, {
      index_pattern: indexPattern,
      dataset: parsed.dataset,
      vendor: vendorToken(parsed.dataset),
      data_streams: [name],
    });
  }

  return Array.from(byPattern.values()).sort((a, b) =>
    a.index_pattern.localeCompare(b.index_pattern)
  );
};
