/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  GLOBAL_SPACE_ID,
  THREAT_INTEL_SOURCES_INDEX,
  APPROVED_SOURCE_IDS,
  type FetchAdapterType,
} from '../../../common/threat_intel';

/**
 * Approved sources seeded into `.kibana-threat-intel-sources` on first boot.
 *
 * Fetch URLs live in `common/threat_intel/catalog_source_urls.ts`, not in the
 * sources index. This is a fixed, approved catalog. Eight sources ship enabled;
 * the optional AWS and FortiGuard packs ship disabled for an operator to turn
 * on per design partner. Operators can only list and enable / disable entries.
 */
interface DefaultSource {
  id: string;
  adapter_type: FetchAdapterType;
  name: string;
  tags: string[];
  /**
   * Declared default state. Eight approved sources ship `true`; the optional
   * AWS and FortiGuard packs ship `false` so an operator opts in per design
   * partner. Reconciliation preserves an operator's later choice across boots.
   */
  enabled: boolean;
}

export const DEFAULT_SOURCES: readonly DefaultSource[] = [
  {
    id: 'kev:cisa-known-exploited-vulnerabilities',
    adapter_type: 'kev',
    name: 'CISA Known Exploited Vulnerabilities',
    tags: ['vulnerability', 'cisa', 'kev', 'government'],
    enabled: true,
  },
  {
    id: 'vendor_api:elastic-security-labs',
    adapter_type: 'rss',
    name: 'Elastic Security Labs',
    tags: ['vendor', 'elastic', 'research', 'research-tools'],
    enabled: true,
  },
  {
    id: 'rss:mandiant-research',
    adapter_type: 'rss',
    name: 'Mandiant / Google Cloud Threat Intelligence',
    tags: ['vendor', 'research', 'apt'],
    enabled: true,
  },
  {
    id: 'rss:unit42',
    adapter_type: 'rss',
    name: 'Palo Alto Networks Unit 42',
    tags: ['vendor', 'research', 'malware', 'apt'],
    enabled: true,
  },
  {
    id: 'rss:talos',
    adapter_type: 'rss',
    name: 'Cisco Talos Intelligence',
    tags: ['vendor', 'research', 'malware'],
    enabled: true,
  },
  {
    id: 'rss:crowdstrike',
    adapter_type: 'rss',
    name: 'CrowdStrike Blog',
    tags: ['vendor', 'research', 'apt'],
    enabled: true,
  },
  {
    id: 'rss:cisa-alerts',
    adapter_type: 'rss',
    name: 'CISA Alerts and Advisories',
    tags: ['government', 'advisories', 'vulnerability', 'government-policy'],
    enabled: true,
  },
  {
    id: 'text_indicator_list:maltrail-cobaltstrike',
    adapter_type: 'text_indicator_list',
    name: 'Maltrail — CobaltStrike C2 indicators',
    tags: ['malware', 'research-tools', 'feed'],
    enabled: true,
  },
  // Optional technology packs, seeded disabled. An operator enables a pack for a
  // design partner (e.g. the AWS IAM pair) without turning on any other pack.
  {
    id: 'rss:aws-security',
    adapter_type: 'rss',
    name: 'AWS Security Blog',
    tags: ['vendor', 'aws', 'cloud', 'iam', 'pack:aws-iam'],
    enabled: false,
  },
  {
    id: 'rss:aws-security-bulletins',
    adapter_type: 'rss',
    name: 'AWS Security Bulletins',
    tags: ['vendor', 'aws', 'cloud', 'iam', 'advisories', 'pack:aws-iam'],
    enabled: false,
  },
  {
    id: 'rss:fortiguard-advisories',
    adapter_type: 'rss',
    name: 'FortiGuard Advisories',
    tags: ['vendor', 'fortinet', 'fortigate', 'advisories', 'pack:fortigate'],
    enabled: false,
  },
  {
    id: 'rss:fortiguard-threat-signal',
    adapter_type: 'rss',
    name: 'FortiGuard Threat Signal',
    tags: ['vendor', 'fortinet', 'fortigate', 'pack:fortigate'],
    enabled: false,
  },
];

export interface SeedDefaultSourcesResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

interface StoredSource {
  adapter_type?: string;
  name?: string;
  enabled?: boolean;
  config?: { url?: string };
  tags?: string[];
  space_id?: string;
  created_at?: string;
}

interface CatalogAction {
  id: string;
  kind: 'create' | 'index';
}

const buildDefaultSourceDocument = (src: DefaultSource, now: string) => ({
  adapter_type: src.adapter_type,
  name: src.name,
  enabled: src.enabled,
  tags: src.tags,
  space_id: GLOBAL_SPACE_ID,
  created_at: now,
  updated_at: now,
});

const arraysEqual = (left: readonly string[] | undefined, right: readonly string[]): boolean =>
  left?.length === right.length && left.every((value, index) => value === right[index]);

const isCatalogCurrent = (stored: StoredSource | undefined, source: DefaultSource): boolean =>
  stored != null &&
  !('config' in stored) &&
  stored.adapter_type === source.adapter_type &&
  stored.name === source.name &&
  arraysEqual(stored.tags, source.tags) &&
  stored.space_id === GLOBAL_SPACE_ID &&
  typeof stored.enabled === 'boolean' &&
  typeof stored.created_at === 'string';

const buildReconciledSourceDocument = (
  source: DefaultSource,
  stored: StoredSource | undefined,
  now: string
) => ({
  adapter_type: source.adapter_type,
  name: source.name,
  enabled: typeof stored?.enabled === 'boolean' ? stored.enabled : source.enabled,
  tags: source.tags,
  space_id: GLOBAL_SPACE_ID,
  created_at: typeof stored?.created_at === 'string' ? stored.created_at : now,
  updated_at: now,
});

const isCreateConflict = (error: { type?: string; status?: number } | undefined): boolean =>
  error?.type === 'version_conflict_engine_exception' || error?.status === 409;

/**
 * Reconciles the fixed source catalog while preserving operator-owned enablement.
 */
export const seedDefaultSources = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<SeedDefaultSourcesResult> => {
  const log = logger.get('seed-default-sources');
  const now = new Date().toISOString();

  const result: SeedDefaultSourcesResult = {
    total: DEFAULT_SOURCES.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  // Debug, not info: this runs on every boot so a partial seed can finish, and on a
  // healthy deployment every entry is already present. The caller logs the outcome at
  // info when something actually changed.
  log.debug(`Reconciling ${result.total} default threat-intel sources`);

  const existing = await esClient.mget<StoredSource>({
    index: THREAT_INTEL_SOURCES_INDEX,
    ids: DEFAULT_SOURCES.map(({ id }) => id),
  });
  const existingById = new Map(existing.docs.map((document) => [document._id, document]));
  const actions: CatalogAction[] = [];
  const operations: Array<Record<string, unknown>> = [];

  for (const source of DEFAULT_SOURCES) {
    const existingDocument = existingById.get(source.id);
    if (!existingDocument) {
      throw new Error(`Catalog read did not return source ${source.id}`);
    }
    if ('error' in existingDocument) {
      throw new Error(
        `Catalog read failed for source ${source.id}: ${existingDocument.error.type ?? 'error'}`
      );
    }
    if (!existingDocument.found) {
      actions.push({ id: source.id, kind: 'create' });
      operations.push(
        { create: { _index: THREAT_INTEL_SOURCES_INDEX, _id: source.id } },
        buildDefaultSourceDocument(source, now)
      );
    } else {
      const stored = existingDocument._source;
      if (!stored) {
        throw new Error(`Catalog source ${source.id} was found without _source`);
      }
      if (isCatalogCurrent(stored, source)) {
        result.skipped += 1;
      } else {
        if (
          existingDocument._seq_no === undefined ||
          existingDocument._primary_term === undefined
        ) {
          throw new Error(`Catalog source ${source.id} is missing concurrency metadata`);
        }
        actions.push({ id: source.id, kind: 'index' });
        operations.push(
          {
            index: {
              _index: THREAT_INTEL_SOURCES_INDEX,
              _id: source.id,
              if_seq_no: existingDocument._seq_no,
              if_primary_term: existingDocument._primary_term,
            },
          },
          buildReconciledSourceDocument(source, stored, now)
        );
      }
    }
  }

  if (operations.length === 0) {
    const legacy = await disableLegacySources({ esClient, logger, now });
    result.updated += legacy.disabled;
    result.failed += legacy.failed;
    log.debug(
      `Default source reconciliation finished: 0 created, ${result.updated} updated, ${result.skipped} unchanged, ${result.failed} failed`
    );
    return result;
  }

  try {
    const bulkResponse = await esClient.bulk({ operations, refresh: false });
    for (let index = 0; index < actions.length; index += 1) {
      const action = actions[index];
      const responseItem = bulkResponse.items[index];
      const item = action.kind === 'create' ? responseItem?.create : responseItem?.index;
      if (!item) {
        result.failed += 1;
      } else if (item.error) {
        if (action.kind === 'create' && isCreateConflict(item.error)) {
          result.skipped += 1;
        } else {
          result.failed += 1;
          log.warn(
            `Failed to reconcile default source ${action.id}: ${item.error.type ?? 'error'} ${
              item.error.reason ?? ''
            }`
          );
        }
      } else if (action.kind === 'create' && item.result === 'created') {
        result.created += 1;
      } else if (action.kind === 'index' && item.result === 'updated') {
        result.updated += 1;
      } else {
        result.failed += 1;
      }
    }
  } catch (err) {
    result.failed += actions.length;
    log.warn(`Bulk source reconciliation failed: ${(err as Error).message}`);
  }

  if (result.created > 0 || result.updated > 0) {
    await esClient.indices.refresh({ index: THREAT_INTEL_SOURCES_INDEX });
  }

  const legacy = await disableLegacySources({ esClient, logger, now });
  result.updated += legacy.disabled;
  result.failed += legacy.failed;

  const summary = `Default source reconciliation finished: ${result.created} created, ${result.updated} updated, ${result.skipped} unchanged, ${result.failed} failed`;
  if (result.created > 0 || result.updated > 0 || result.failed > 0) {
    log.info(summary);
  } else {
    log.debug(summary);
  }

  return result;
};

/** Page size for disabling out-of-catalog enabled sources. Exported for multi-page tests. */
export const LEGACY_SOURCE_DISABLE_PAGE_SIZE = 1000;

const disableLegacySources = async ({
  esClient,
  logger,
  now,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  now: string;
}): Promise<{ disabled: number; failed: number }> => {
  const log = logger.get('seed-default-sources');
  let disabled = 0;
  let failed = 0;
  let searchAfter: estypes.SortResults | undefined;

  for (;;) {
    const response = await esClient.search<{ enabled?: boolean }>({
      index: THREAT_INTEL_SOURCES_INDEX,
      size: LEGACY_SOURCE_DISABLE_PAGE_SIZE,
      sort: [{ _id: 'asc' }],
      ...(searchAfter ? { search_after: searchAfter } : {}),
      _source: ['enabled'],
      query: {
        bool: {
          filter: [{ term: { enabled: true } }],
          must_not: [{ ids: { values: [...APPROVED_SOURCE_IDS] } }],
        },
      },
    });

    const hits = (response.hits.hits ?? []).filter((document) => document._id);
    if (hits.length === 0) {
      break;
    }

    for (const hit of hits) {
      const sourceId = hit._id as string;
      try {
        await esClient.update({
          index: THREAT_INTEL_SOURCES_INDEX,
          id: sourceId,
          doc: { enabled: false, updated_at: now },
          refresh: false,
        });
        disabled += 1;
        log.info(`Disabled legacy source outside the fixed catalog: ${sourceId}`);
      } catch (err) {
        failed += 1;
        log.warn(`Failed to disable legacy source ${sourceId}: ${(err as Error).message}`);
      }
    }

    if (hits.length < LEGACY_SOURCE_DISABLE_PAGE_SIZE) {
      break;
    }

    const lastSort = hits[hits.length - 1]?.sort;
    if (!lastSort) {
      throw new Error('Legacy source search page is missing sort values for search_after');
    }
    searchAfter = lastSort;
  }

  if (disabled > 0) {
    await esClient.indices.refresh({ index: THREAT_INTEL_SOURCES_INDEX });
  }

  return { disabled, failed };
};
