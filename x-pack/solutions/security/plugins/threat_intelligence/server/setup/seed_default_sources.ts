/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { THREAT_INTEL_SOURCES_INDEX } from '../../common';

/**
 * Curated starter set of default sources. The original repo bundled the full
 * 214-feed list from foorilla/allinfosecnews_sources; the long tail is
 * intentionally not in-repo here so we don't carry a third-party catalog as
 * Kibana code. Operators expand the set via the manage-sources flow.
 *
 * Elastic Security Labs is included as a built-in vendor_api source so the
 * skill has at least one working ingestion path on a fresh install.
 */
interface DefaultSource {
  id: string;
  adapter_type: 'rss' | 'vendor_api';
  name: string;
  config: { url: string };
  tags: string[];
}

export const DEFAULT_SOURCES: readonly DefaultSource[] = [
  {
    id: 'rss:bleeping-computer',
    adapter_type: 'rss',
    name: 'BleepingComputer',
    config: { url: 'https://www.bleepingcomputer.com/feed/' },
    tags: ['vendor', 'general-news'],
  },
  {
    id: 'rss:the-hacker-news',
    adapter_type: 'rss',
    name: 'The Hacker News',
    config: { url: 'https://feeds.feedburner.com/TheHackersNews' },
    tags: ['vendor', 'general-news'],
  },
  {
    id: 'rss:krebs-on-security',
    adapter_type: 'rss',
    name: 'Krebs on Security',
    config: { url: 'https://krebsonsecurity.com/feed/' },
    tags: ['vendor', 'investigative'],
  },
  {
    id: 'rss:cisa-alerts',
    adapter_type: 'rss',
    name: 'CISA Alerts',
    config: { url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml' },
    tags: ['government', 'advisories'],
  },
  {
    id: 'rss:mandiant-research',
    adapter_type: 'rss',
    name: 'Mandiant Research',
    config: { url: 'https://cloud.google.com/security/blog/threat-intelligence/rss' },
    tags: ['vendor', 'research'],
  },
  {
    id: 'rss:microsoft-security',
    adapter_type: 'rss',
    name: 'Microsoft Security Response Center',
    config: { url: 'https://msrc-blog.microsoft.com/feed/' },
    tags: ['vendor', 'advisories'],
  },
  {
    id: 'vendor_api:elastic-security-labs',
    adapter_type: 'vendor_api',
    name: 'Elastic Security Labs',
    config: { url: 'https://www.elastic.co/security-labs/rss/feed.xml' },
    tags: ['vendor', 'elastic', 'research'],
  },
];

/**
 * Idempotent seeding — inserts each default source by stable id with
 * `op_type: index` so re-runs don't duplicate. Operator edits to enabled,
 * tags, or config survive subsequent seeds because we only write the fields
 * that should be authoritative on initial install.
 */
export const seedDefaultSources = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  const log = logger.get('seed-default-sources');
  const now = new Date().toISOString();

  for (const src of DEFAULT_SOURCES) {
    try {
      const existing = await esClient.get(
        { index: THREAT_INTEL_SOURCES_INDEX, id: src.id },
        { ignore: [404] }
      );
      if (existing.found) continue;

      await esClient.index({
        index: THREAT_INTEL_SOURCES_INDEX,
        id: src.id,
        document: {
          adapter_type: src.adapter_type,
          name: src.name,
          enabled: true,
          config: src.config,
          tags: src.tags,
          created_at: now,
          updated_at: now,
        },
      });
      log.debug(`Seeded default source ${src.id}`);
    } catch (err) {
      log.warn(`Failed to seed default source ${src.id}: ${(err as Error).message}`);
    }
  }
};
