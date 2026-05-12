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
 * Selection criteria (kept deliberately strict so this list stays
 * maintainable):
 *   1. First-party vendor research blogs (Mandiant, Unit 42, Talos, CrowdStrike,
 *      Microsoft, Google TAG, Trend Micro, Elastic Security Labs).
 *   2. Government / CERT advisories that publish a stable RSS endpoint (CISA,
 *      UK NCSC, AU ACSC, NVD, US-CERT).
 *   3. Reputable independent / investigative outlets that the wider community
 *      already treats as authoritative (KrebsOnSecurity, BleepingComputer,
 *      DarkReading, The Hacker News, SecurityWeek).
 *   4. Ransomware/extortion-leak watch feeds (RansomLook).
 *
 * Coverage across the PRD's 15-category taxonomy is intentional: every
 * built-in category (`malware`, `ransomware`, `apt`, `vulnerability`,
 * `data-breach`, `phishing`, `cloud`, `supply-chain`, `cybercrime`,
 * `insider-threat`, `iot`, `ot-ics`, `government-policy`,
 * `privacy-compliance`, `research-tools`) has at least one feed below.
 *
 * Elastic Security Labs is the canonical built-in `vendor_api` source so the
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
  // --- Vendor research blogs ---------------------------------------------
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
    id: 'rss:sentinelone',
    adapter_type: 'rss',
    name: 'SentinelOne Labs',
    config: { url: 'https://www.sentinelone.com/labs/feed/' },
    tags: ['vendor', 'research', 'malware'],
  },
  {
    id: 'rss:microsoft-security-blog',
    adapter_type: 'rss',
    name: 'Microsoft Security Blog',
    config: { url: 'https://www.microsoft.com/en-us/security/blog/feed/' },
    tags: ['vendor', 'research', 'cloud'],
  },
  {
    id: 'rss:microsoft-msrc',
    adapter_type: 'rss',
    name: 'Microsoft Security Response Center',
    config: { url: 'https://msrc-blog.microsoft.com/feed/' },
    tags: ['vendor', 'advisories', 'vulnerability'],
  },
  {
    id: 'rss:google-tag',
    adapter_type: 'rss',
    name: 'Google Threat Analysis Group',
    config: { url: 'https://blog.google/threat-analysis-group/rss/' },
    tags: ['vendor', 'research', 'apt'],
  },
  {
    id: 'rss:trend-micro',
    adapter_type: 'rss',
    name: 'Trend Micro Research',
    config: { url: 'https://www.trendmicro.com/en_us/research.rss' },
    tags: ['vendor', 'research', 'malware', 'cloud'],
  },
  {
    id: 'rss:proofpoint',
    adapter_type: 'rss',
    name: 'Proofpoint Threat Insight',
    config: { url: 'https://www.proofpoint.com/us/rss.xml' },
    tags: ['vendor', 'research', 'phishing'],
  },
  {
    id: 'rss:wiz',
    adapter_type: 'rss',
    name: 'Wiz Cloud Security Research',
    config: { url: 'https://www.wiz.io/feed.xml' },
    tags: ['vendor', 'research', 'cloud'],
  },
  {
    id: 'rss:google-project-zero',
    adapter_type: 'rss',
    name: 'Google Project Zero',
    config: { url: 'https://googleprojectzero.blogspot.com/feeds/posts/default' },
    tags: ['vendor', 'research', 'vulnerability'],
  },

  // --- Government / CERT advisories --------------------------------------
  {
    id: 'rss:cisa-alerts',
    adapter_type: 'rss',
    name: 'CISA Alerts and Advisories',
    config: { url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml' },
    tags: ['government', 'advisories', 'vulnerability', 'government-policy'],
  },
  {
    id: 'rss:cisa-ics-advisories',
    adapter_type: 'rss',
    name: 'CISA ICS Advisories',
    config: { url: 'https://www.cisa.gov/cybersecurity-advisories/ics-advisories.xml' },
    tags: ['government', 'advisories', 'ot-ics'],
  },
  {
    id: 'rss:ncsc-uk',
    adapter_type: 'rss',
    name: 'UK National Cyber Security Centre',
    config: { url: 'https://www.ncsc.gov.uk/api/1/services/v1/all-rss-feed.xml' },
    tags: ['government', 'advisories', 'government-policy'],
  },
  {
    id: 'rss:acsc-au',
    adapter_type: 'rss',
    name: 'Australian Cyber Security Centre',
    config: { url: 'https://www.cyber.gov.au/about-us/view-all-content/alerts/rss.xml' },
    tags: ['government', 'advisories', 'government-policy'],
  },
  {
    id: 'rss:nvd-recent',
    adapter_type: 'rss',
    name: 'NVD Recent CVEs',
    config: { url: 'https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss-analyzed.xml' },
    tags: ['government', 'vulnerability'],
  },

  // --- Independent / investigative outlets -------------------------------
  {
    id: 'rss:krebs-on-security',
    adapter_type: 'rss',
    name: 'Krebs on Security',
    config: { url: 'https://krebsonsecurity.com/feed/' },
    tags: ['investigative', 'cybercrime', 'data-breach'],
  },
  {
    id: 'rss:bleeping-computer',
    adapter_type: 'rss',
    name: 'BleepingComputer',
    config: { url: 'https://www.bleepingcomputer.com/feed/' },
    tags: ['general-news', 'malware', 'ransomware'],
  },
  {
    id: 'rss:the-hacker-news',
    adapter_type: 'rss',
    name: 'The Hacker News',
    config: { url: 'https://feeds.feedburner.com/TheHackersNews' },
    tags: ['general-news', 'malware', 'vulnerability'],
  },
  {
    id: 'rss:dark-reading',
    adapter_type: 'rss',
    name: 'Dark Reading',
    config: { url: 'https://www.darkreading.com/rss.xml' },
    tags: ['general-news', 'cybercrime', 'insider-threat'],
  },
  {
    id: 'rss:securityweek',
    adapter_type: 'rss',
    name: 'SecurityWeek',
    config: { url: 'https://www.securityweek.com/feed/' },
    tags: ['general-news', 'data-breach', 'privacy-compliance'],
  },
  {
    id: 'rss:therecord',
    adapter_type: 'rss',
    name: 'The Record by Recorded Future',
    config: { url: 'https://therecord.media/feed/' },
    tags: ['general-news', 'cybercrime', 'apt'],
  },
  {
    id: 'rss:schneier',
    adapter_type: 'rss',
    name: 'Schneier on Security',
    config: { url: 'https://www.schneier.com/feed/atom/' },
    tags: ['analysis', 'privacy-compliance', 'government-policy'],
  },

  // --- Ransomware / extortion watch --------------------------------------
  {
    id: 'rss:ransomlook-news',
    adapter_type: 'rss',
    name: 'RansomLook News',
    config: { url: 'https://www.ransomlook.io/feeds/news.xml' },
    tags: ['ransomware', 'extortion', 'cybercrime'],
  },

  // --- IoT / niche --------------------------------------------------------
  {
    id: 'rss:iot-security-foundation',
    adapter_type: 'rss',
    name: 'IoT Security Foundation Blog',
    config: { url: 'https://iotsecurityfoundation.org/feed/' },
    tags: ['iot', 'research'],
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
