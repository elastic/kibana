/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { GLOBAL_SPACE_ID, THREAT_INTEL_SOURCES_INDEX } from '../../../common/threat_intel';

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
  adapter_type: 'rss' | 'vendor_api' | 'text_indicator_list' | 'kev';
  name: string;
  config: { url: string };
  tags: string[];
  /**
   * Declared default state. Eight approved sources ship `true`; the optional
   * AWS and FortiGuard packs ship `false` so an operator opts in per design
   * partner. Create-only seeding means an operator's later choice survives boots.
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
    adapter_type: 'vendor_api',
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
  skipped: number;
  failed: number;
}

const BULK_CREATE_CHUNK_SIZE = 50;

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

  // Debug, not info: this runs on every boot so a partial seed can finish, and on a
  // healthy deployment every entry is already present. The caller logs the outcome at
  // info when something actually changed.
  log.debug(`Seeding ${result.total} default threat-intel sources`);

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

  // A healthy catalog re-seeds on every boot and every source 409s, so an
  // unconditional info log would report `0 created, 8 skipped` forever. Only
  // an actual change or failure is worth an operator's attention.
  const summary = `Default source seeding finished: ${result.created} created, ${result.skipped} skipped, ${result.failed} failed`;
  if (result.created > 0 || result.failed > 0) {
    log.info(summary);
  } else {
    log.debug(summary);
  }

  return result;
};
