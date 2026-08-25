/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { GLOBAL_SPACE_ID, THREAT_INTEL_SOURCES_INDEX } from '../../../common/threat_intel';

/**
 * Default sources seeded into `.kibana-threat-intel-sources` on first boot.
 *
 * Small curated starter set: first-party vendor research, CISA KEV, and a
 * couple of high-signal RSS feeds. Operators expand the catalog through the
 * create / update / delete source APIs.
 */
interface DefaultSource {
  id: string;
  adapter_type: 'rss' | 'vendor_api' | 'text_indicator_list' | 'kev';
  name: string;
  config: { url: string };
  tags: string[];
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
  },
  {
    id: 'vendor_api:elastic-security-labs',
    adapter_type: 'vendor_api',
    name: 'Elastic Security Labs',
    config: { url: 'https://www.elastic.co/security-labs/rss/feed.xml' },
    tags: ['vendor', 'elastic', 'research', 'research-tools'],
  },
  {
    id: 'rss:mandiant-research',
    adapter_type: 'rss',
    name: 'Mandiant / Google Cloud Threat Intelligence',
    config: { url: 'https://cloud.google.com/security/blog/threat-intelligence/rss' },
    tags: ['vendor', 'research', 'apt'],
  },
  {
    id: 'rss:unit42',
    adapter_type: 'rss',
    name: 'Palo Alto Networks Unit 42',
    config: { url: 'https://unit42.paloaltonetworks.com/feed/' },
    tags: ['vendor', 'research', 'malware', 'apt'],
  },
  {
    id: 'rss:talos',
    adapter_type: 'rss',
    name: 'Cisco Talos Intelligence',
    config: { url: 'https://blog.talosintelligence.com/rss/' },
    tags: ['vendor', 'research', 'malware'],
  },
  {
    id: 'rss:crowdstrike',
    adapter_type: 'rss',
    name: 'CrowdStrike Blog',
    config: { url: 'https://www.crowdstrike.com/blog/feed/' },
    tags: ['vendor', 'research', 'apt'],
  },
  {
    id: 'rss:cisa-alerts',
    adapter_type: 'rss',
    name: 'CISA Alerts and Advisories',
    config: { url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml' },
    tags: ['government', 'advisories', 'vulnerability', 'government-policy'],
  },
  {
    id: 'text_indicator_list:maltrail-cobaltstrike',
    adapter_type: 'text_indicator_list',
    name: 'Maltrail — CobaltStrike C2 indicators',
    config: {
      url: 'https://raw.githubusercontent.com/stamparm/maltrail/master/trails/static/malware/cobaltstrike.txt',
    },
    tags: ['malware', 'research-tools', 'feed'],
  },
];

export interface SeedDefaultSourcesResult {
  total: number;
  created: number;
  skipped: number;
  failed: number;
}

const BULK_CREATE_CHUNK_SIZE = 50;

const buildDefaultSourceDocument = (src: DefaultSource, now: string) => ({
  adapter_type: src.adapter_type,
  name: src.name,
  enabled: true,
  config: src.config,
  tags: src.tags,
  space_id: GLOBAL_SPACE_ID,
  created_at: now,
  updated_at: now,
});

const isCreateConflict = (error: { type?: string; status?: number } | undefined): boolean =>
  error?.type === 'version_conflict_engine_exception' || error?.status === 409;

/**
 * Idempotent seeding — bulk `create` by stable id so re-runs do not duplicate.
 * Operator edits to enabled, tags, or config survive subsequent seeds because
 * we only insert missing ids (conflicts are treated as already present).
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
    skipped: 0,
    failed: 0,
  };

  log.info(`Seeding ${result.total} default threat-intel sources`);

  for (let offset = 0; offset < DEFAULT_SOURCES.length; offset += BULK_CREATE_CHUNK_SIZE) {
    const chunk = DEFAULT_SOURCES.slice(offset, offset + BULK_CREATE_CHUNK_SIZE);
    const operations = chunk.flatMap((src) => [
      { create: { _index: THREAT_INTEL_SOURCES_INDEX, _id: src.id } },
      buildDefaultSourceDocument(src, now),
    ]);

    try {
      const bulkResponse = await esClient.bulk({
        operations,
        refresh: false,
      });

      for (const item of bulkResponse.items) {
        const createItem = item.create;
        if (!createItem) {
          result.failed += 1;
        } else if (createItem.error) {
          if (isCreateConflict(createItem.error)) {
            result.skipped += 1;
          } else {
            result.failed += 1;
            log.warn(
              `Failed to seed default source ${createItem._id}: ${
                createItem.error.type ?? 'error'
              } ${createItem.error.reason ?? ''}`
            );
          }
        } else if (createItem.result === 'created') {
          result.created += 1;
          log.debug(`Seeded default source ${createItem._id}`);
        }
      }
    } catch (err) {
      const message = (err as Error).message;
      result.failed += chunk.length;
      log.warn(
        `Bulk seed failed for sources ${chunk[0]?.id ?? '?'}..${
          chunk[chunk.length - 1]?.id ?? '?'
        }: ${message}`
      );
    }
  }

  if (result.created > 0) {
    await esClient.indices.refresh({ index: THREAT_INTEL_SOURCES_INDEX });
  }

  log.info(
    `Default source seeding finished: ${result.created} created, ${result.skipped} skipped, ${result.failed} failed`
  );

  return result;
};
