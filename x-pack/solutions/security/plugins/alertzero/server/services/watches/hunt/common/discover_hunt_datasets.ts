/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export interface DiscoveredDataset {
  /** Searchable glob for Tier 1/2, e.g. 'logs-okta.system-*' */
  index_pattern: string;
  /** e.g. 'okta.system' */
  dataset: string;
  /**
   * Dataset's vendor token: the segment before the first '.' or '-', e.g. 'okta' for
   * `okta.system` and for `okta-prod` (a dashed namespace this parser could not tell
   * apart from the dataset). Whole dataset when it has neither.
   */
  vendor: string;
  /** backing data stream names that produced this entry, e.g. ['logs-okta.system-default'] */
  data_streams: string[];
  /**
   * What a hunt actually searches for this dataset. Normally `[index_pattern]`. When
   * another discovered dataset extends this one's name with a dash (`windows` beside
   * `windows-defender`), `logs-windows-*` would also match `logs-windows-defender-*`, so
   * the entry searches its own namespaces instead: `logs-windows-default*`, one per
   * backing stream. The trailing `*` keeps Tier 2's allowlist probe working, which
   * needs a wildcard-bearing pattern to cover the dated backing indices. One case stays
   * ambiguous and is logged: a sibling whose dataset name extends a full stream name
   * (`windows-default` beside stream `logs-windows-default`).
   */
  search_patterns: string[];
}

export const HUNT_DISCOVERY_PATTERN = 'logs-*';

/** Agent-internal datasets never worth hunting; dropped from discovery. */
export const INTERNAL_DATASET_PREFIXES = ['elastic_agent', 'fleet_server'];

/**
 * Most per-namespace patterns one dataset may contribute to a scope. The scope's
 * targets travel in the request path, so a dataset with hundreds of namespaces
 * cannot be isolated stream by stream; past this it searches its plain
 * `logs-<dataset>-*` pattern and accepts the sibling over-match, logged.
 */
export const MAX_NAMESPACE_PATTERNS_PER_DATASET = 16;

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

// Fleet datasets are `<package>.<stream>` and package names use `_`, never `.` or `-`, so
// the vendor token ends at the first of either. Stopping at '-' too means a dashed
// namespace that leaked into the dataset (see `parseDataStreamName`) cannot hide the
// vendor: `logs-okta-prod-eu` still yields `okta`.
const vendorToken = (dataset: string): string => {
  const end = dataset.search(/[.-]/);
  return end === -1 ? dataset : dataset.slice(0, end);
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
    // `_resolve/index` directly rather than through `listSearchSources`: that helper
    // caps each result type and truncates silently past the cap, and a truncated list
    // would let a broad scope read as complete while the dataset holding the hit was
    // never seen. The resolve API returns every stream the caller may see; hidden
    // (dot-prefixed) streams are the only ones dropped.
    const resolved = await esClient.indices.resolveIndex({
      name: [pattern],
      allow_no_indices: true,
      expand_wildcards: ['open'],
    });
    dataStreamNames = resolved.data_streams
      .map((stream) => stream.name)
      .filter((name) => !name.startsWith('.'));
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
      search_patterns: [indexPattern],
    });
  }

  // Sorted by dataset name with a code-point compare, so every sibling that extends a
  // name with a dash sits directly after it ('-' orders before '.', '_' and every
  // letter). That turns sibling detection into one forward walk per dataset instead
  // of a full pass over the list, which matters once an estate has thousands.
  const datasets = Array.from(byPattern.values()).sort((a, b) =>
    a.dataset < b.dataset ? -1 : a.dataset > b.dataset ? 1 : 0
  );
  for (let i = 0; i < datasets.length; i++) {
    const entry = datasets[i];
    const siblings: DiscoveredDataset[] = [];
    for (
      let j = i + 1;
      j < datasets.length && datasets[j].dataset.startsWith(`${entry.dataset}-`);
      j++
    ) {
      siblings.push(datasets[j]);
    }
    if (siblings.length === 0) {
      entry.search_patterns = [entry.index_pattern];
      continue;
    }
    if (entry.data_streams.length > MAX_NAMESPACE_PATTERNS_PER_DATASET) {
      entry.search_patterns = [entry.index_pattern];
      logger?.warn(
        `Hunt dataset discovery keeps ${entry.index_pattern} for ${
          entry.dataset
        } despite sibling dataset(s) ${siblings.map((other) => other.dataset).join(', ')}: ${
          entry.data_streams.length
        } namespaces exceed the ${MAX_NAMESPACE_PATTERNS_PER_DATASET} per-namespace patterns a scope may carry`
      );
      continue;
    }
    entry.search_patterns = entry.data_streams.map((stream) => `${stream}*`);
    // Residual case no wildcard can isolate: a sibling whose dataset name extends one of
    // this entry's full stream names (`windows-default` beside stream `logs-windows-default`).
    // Concrete stream names are not an option, since Tier 1's hit bar globs required
    // patterns against dated backing indices and Tier 2's allowlist probe needs a
    // wildcard, so the pattern stays and the overlap is made visible instead.
    for (const stream of entry.data_streams) {
      const parsed = parseDataStreamName(stream);
      const leaking = parsed
        ? siblings.filter((other) =>
            other.dataset.startsWith(`${parsed.dataset}-${parsed.namespace}`)
          )
        : [];
      if (leaking.length > 0) {
        logger?.warn(
          `Hunt dataset discovery cannot isolate ${stream}* from sibling dataset(s) ${leaking
            .map((other) => other.dataset)
            .join(', ')}; a hit there would count for ${entry.dataset}`
        );
      }
    }
  }

  return datasets.sort((a, b) => a.index_pattern.localeCompare(b.index_pattern));
};
