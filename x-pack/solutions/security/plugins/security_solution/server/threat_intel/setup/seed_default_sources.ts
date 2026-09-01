/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  GLOBAL_SPACE_ID,
  THREAT_INTEL_SOURCES_INDEX,
  type FetchAdapterType,
} from '../../../common/threat_intel';

/**
 * Approved sources seeded into `.kibana-threat-intel-sources` on first boot.
 *
 * This is a fixed, approved catalog. Eight sources ship enabled; the optional
 * AWS and FortiGuard packs ship disabled for an operator to turn on per design
 * partner. Operators can only list and enable / disable entries — the catalog
 * is not operator-extensible, so there is no create / update / delete path.
 */
interface DefaultSource {
  id: string;
  adapter_type: FetchAdapterType;
  name: string;
  config: { url: string };
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
    config: {
      url: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
    },
    tags: ['vulnerability', 'cisa', 'kev', 'government'],
    enabled: true,
  },
  {
    id: 'vendor_api:elastic-security-labs',
    adapter_type: 'rss',
    name: 'Elastic Security Labs',
    config: { url: 'https://www.elastic.co/security-labs/rss/feed.xml' },
    tags: ['vendor', 'elastic', 'research', 'research-tools'],
    enabled: true,
  },
  {
    id: 'rss:mandiant-research',
    adapter_type: 'rss',
    name: 'Mandiant / Google Cloud Threat Intelligence',
    config: { url: 'https://cloud.google.com/security/blog/threat-intelligence/rss' },
    tags: ['vendor', 'research', 'apt'],
    enabled: true,
  },
  {
    id: 'rss:unit42',
    adapter_type: 'rss',
    name: 'Palo Alto Networks Unit 42',
    config: { url: 'https://unit42.paloaltonetworks.com/feed/' },
    tags: ['vendor', 'research', 'malware', 'apt'],
    enabled: true,
  },
  {
    id: 'rss:talos',
    adapter_type: 'rss',
    name: 'Cisco Talos Intelligence',
    config: { url: 'https://blog.talosintelligence.com/rss/' },
    tags: ['vendor', 'research', 'malware'],
    enabled: true,
  },
  {
    id: 'rss:crowdstrike',
    adapter_type: 'rss',
    name: 'CrowdStrike Blog',
    config: { url: 'https://www.crowdstrike.com/blog/feed/' },
    tags: ['vendor', 'research', 'apt'],
    enabled: true,
  },
  {
    id: 'rss:cisa-alerts',
    adapter_type: 'rss',
    name: 'CISA Alerts and Advisories',
    config: { url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml' },
    tags: ['government', 'advisories', 'vulnerability', 'government-policy'],
    enabled: true,
  },
  {
    id: 'text_indicator_list:maltrail-cobaltstrike',
    adapter_type: 'text_indicator_list',
    name: 'Maltrail — CobaltStrike C2 indicators',
    config: {
      url: 'https://raw.githubusercontent.com/stamparm/maltrail/master/trails/static/malware/cobaltstrike.txt',
    },
    tags: ['malware', 'research-tools', 'feed'],
    enabled: true,
  },
  // Optional technology packs, seeded disabled. An operator enables a pack for a
  // design partner (e.g. the AWS IAM pair) without turning on any other pack.
  {
    id: 'rss:aws-security',
    adapter_type: 'rss',
    name: 'AWS Security Blog',
    config: { url: 'https://aws.amazon.com/blogs/security/feed/' },
    tags: ['vendor', 'aws', 'cloud', 'iam', 'pack:aws-iam'],
    enabled: false,
  },
  {
    id: 'rss:aws-security-bulletins',
    adapter_type: 'rss',
    name: 'AWS Security Bulletins',
    config: { url: 'https://aws.amazon.com/security/security-bulletins/rss/feed/' },
    tags: ['vendor', 'aws', 'cloud', 'iam', 'advisories', 'pack:aws-iam'],
    enabled: false,
  },
  {
    id: 'rss:fortiguard-advisories',
    adapter_type: 'rss',
    name: 'FortiGuard Advisories',
    config: { url: 'https://filestore.fortinet.com/fortiguard/rss/ir.xml' },
    tags: ['vendor', 'fortinet', 'fortigate', 'advisories', 'pack:fortigate'],
    enabled: false,
  },
  {
    id: 'rss:fortiguard-threat-signal',
    adapter_type: 'rss',
    name: 'FortiGuard Threat Signal',
    config: { url: 'https://filestore.fortinet.com/fortiguard/rss/threatsignal.xml' },
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
  config: src.config,
  tags: src.tags,
  space_id: GLOBAL_SPACE_ID,
  created_at: now,
  updated_at: now,
});

const arraysEqual = (left: readonly string[] | undefined, right: readonly string[]): boolean =>
  left?.length === right.length && left.every((value, index) => value === right[index]);

const isCatalogCurrent = (stored: StoredSource | undefined, source: DefaultSource): boolean =>
  stored?.adapter_type === source.adapter_type &&
  stored.name === source.name &&
  stored.config?.url === source.config.url &&
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
  config: source.config,
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
    if (!existingDocument?.found) {
      actions.push({ id: source.id, kind: 'create' });
      operations.push(
        { create: { _index: THREAT_INTEL_SOURCES_INDEX, _id: source.id } },
        buildDefaultSourceDocument(source, now)
      );
    } else {
      const stored = existingDocument._source;
      if (isCatalogCurrent(stored, source)) {
        result.skipped += 1;
      } else {
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
    log.debug(
      `Default source reconciliation finished: 0 created, 0 updated, ${result.skipped} unchanged, 0 failed`
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

  const summary = `Default source reconciliation finished: ${result.created} created, ${result.updated} updated, ${result.skipped} unchanged, ${result.failed} failed`;
  if (result.created > 0 || result.updated > 0 || result.failed > 0) {
    log.info(summary);
  } else {
    log.debug(summary);
  }

  return result;
};
