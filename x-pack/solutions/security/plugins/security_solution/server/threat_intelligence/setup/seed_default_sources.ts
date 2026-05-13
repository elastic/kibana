/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  GLOBAL_SPACE_ID,
  THREAT_CATEGORIES,
  THREAT_INTEL_SOURCES_INDEX,
  type ThreatCategory,
} from '../../../common/threat_intelligence/hub';

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
 *      UK NCSC, AU ACSC, NVD, US-CERT, CCCS, ENISA, JPCERT, BSI).
 *   3. Reputable independent / investigative outlets that the wider community
 *      already treats as authoritative (KrebsOnSecurity, BleepingComputer,
 *      DarkReading, The Hacker News, SecurityWeek).
 *   4. Ransomware/extortion-leak watch feeds (RansomLook).
 *
 * Coverage across the PRD's 15-category taxonomy is enforced by the
 * `categoryCoverage` invariant assertion below: every built-in category has
 * at least **two** distinct feeds so the dashboard's category panel isn't a
 * one-source view.
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
  {
    id: 'rss:ransomware-live',
    adapter_type: 'rss',
    name: 'Ransomware.live',
    config: { url: 'https://www.ransomware.live/rss.xml' },
    tags: ['ransomware', 'extortion'],
  },

  // --- IoT / OT-ICS niche -------------------------------------------------
  {
    id: 'rss:iot-security-foundation',
    adapter_type: 'rss',
    name: 'IoT Security Foundation Blog',
    config: { url: 'https://iotsecurityfoundation.org/feed/' },
    tags: ['iot', 'research'],
  },
  {
    id: 'rss:claroty-team82',
    adapter_type: 'rss',
    name: 'Claroty Team82 Research',
    config: { url: 'https://claroty.com/team82/research/rss.xml' },
    tags: ['vendor', 'research', 'ot-ics', 'iot'],
  },
  {
    id: 'rss:dragos-blog',
    adapter_type: 'rss',
    name: 'Dragos Blog',
    config: { url: 'https://www.dragos.com/blog/feed/' },
    tags: ['vendor', 'research', 'ot-ics'],
  },
  {
    id: 'rss:nozomi-labs',
    adapter_type: 'rss',
    name: 'Nozomi Networks Labs',
    config: { url: 'https://www.nozominetworks.com/blog/feed/' },
    tags: ['vendor', 'research', 'ot-ics', 'iot'],
  },

  // --- Cloud / SaaS -------------------------------------------------------
  {
    id: 'rss:aws-security',
    adapter_type: 'rss',
    name: 'AWS Security Blog',
    config: { url: 'https://aws.amazon.com/blogs/security/feed/' },
    tags: ['vendor', 'advisories', 'cloud'],
  },
  {
    id: 'rss:gcp-security',
    adapter_type: 'rss',
    name: 'Google Cloud Security Blog',
    config: { url: 'https://cloud.google.com/blog/products/identity-security/rss' },
    tags: ['vendor', 'advisories', 'cloud'],
  },
  {
    id: 'rss:datadog-security-labs',
    adapter_type: 'rss',
    name: 'Datadog Security Labs',
    config: { url: 'https://securitylabs.datadoghq.com/rss/feed.xml' },
    tags: ['vendor', 'research', 'cloud', 'supply-chain'],
  },

  // --- Phishing / credential abuse ---------------------------------------
  {
    id: 'rss:phishlabs',
    adapter_type: 'rss',
    name: 'Fortra PhishLabs',
    config: { url: 'https://www.fortra.com/blog/feed' },
    tags: ['vendor', 'research', 'phishing'],
  },
  {
    id: 'rss:openphish-news',
    adapter_type: 'rss',
    name: 'OpenPhish Notices',
    config: { url: 'https://openphish.com/feed.txt' },
    tags: ['phishing', 'feed'],
  },

  // --- Supply chain / open-source -----------------------------------------
  {
    id: 'rss:reversinglabs-blog',
    adapter_type: 'rss',
    name: 'ReversingLabs Blog',
    config: { url: 'https://www.reversinglabs.com/blog/rss.xml' },
    tags: ['vendor', 'research', 'supply-chain', 'malware'],
  },
  {
    id: 'rss:snyk-vulnerability-db',
    adapter_type: 'rss',
    name: 'Snyk Vulnerability Disclosures',
    config: { url: 'https://snyk.io/vuln/feed.xml' },
    tags: ['vendor', 'advisories', 'supply-chain', 'vulnerability'],
  },
  {
    id: 'rss:github-advisory-database',
    adapter_type: 'rss',
    name: 'GitHub Advisory Database',
    config: { url: 'https://github.com/advisories.atom' },
    tags: ['advisories', 'supply-chain', 'vulnerability'],
  },

  // --- Data breach / leak tracking ---------------------------------------
  {
    id: 'rss:hibp-feed',
    adapter_type: 'rss',
    name: 'Have I Been Pwned Latest Breaches',
    config: { url: 'https://feeds.feedburner.com/HaveIBeenPwnedLatestBreaches' },
    tags: ['data-breach'],
  },
  {
    id: 'rss:databreaches-net',
    adapter_type: 'rss',
    name: 'DataBreaches.net',
    config: { url: 'https://www.databreaches.net/feed/' },
    tags: ['data-breach', 'cybercrime'],
  },

  // --- Insider threat / fraud --------------------------------------------
  {
    id: 'rss:cert-insider-threat',
    adapter_type: 'rss',
    name: 'CERT Insider Threat Center',
    config: { url: 'https://insights.sei.cmu.edu/insider-threat/feed/' },
    tags: ['research', 'insider-threat'],
  },
  {
    id: 'rss:ic3-public',
    adapter_type: 'rss',
    name: 'FBI IC3 Public Service Announcements',
    config: { url: 'https://www.ic3.gov/Media/News/RssFeed' },
    tags: ['government', 'cybercrime', 'insider-threat'],
  },

  // --- Government / CERT (extended) --------------------------------------
  {
    id: 'rss:cccs-canada',
    adapter_type: 'rss',
    name: 'Canadian Centre for Cyber Security',
    config: { url: 'https://www.cyber.gc.ca/api/cccs/threats/v1/rss/en' },
    tags: ['government', 'advisories', 'government-policy'],
  },
  {
    id: 'rss:enisa',
    adapter_type: 'rss',
    name: 'ENISA News',
    config: { url: 'https://www.enisa.europa.eu/rss/news' },
    tags: ['government', 'government-policy', 'privacy-compliance'],
  },
  {
    id: 'rss:bsi-de',
    adapter_type: 'rss',
    name: 'German BSI CERT-Bund WID',
    config: { url: 'https://wid.cert-bund.de/content/public/securityAdvisory/rss' },
    tags: ['government', 'advisories'],
  },
  {
    id: 'rss:jpcert',
    adapter_type: 'rss',
    name: 'JPCERT/CC Alerts',
    config: { url: 'https://www.jpcert.or.jp/english/rss/jpcert-en.rdf' },
    tags: ['government', 'advisories'],
  },

  // --- Privacy / compliance ----------------------------------------------
  {
    id: 'rss:iapp-news',
    adapter_type: 'rss',
    name: 'IAPP Privacy Tracker',
    config: { url: 'https://iapp.org/news/rss/' },
    tags: ['privacy-compliance', 'government-policy'],
  },
  {
    id: 'rss:edps-news',
    adapter_type: 'rss',
    name: 'European Data Protection Supervisor',
    config: { url: 'https://www.edps.europa.eu/press-publications/press-news/rss_en' },
    tags: ['government', 'privacy-compliance'],
  },

  // --- APT / nation-state tracking ---------------------------------------
  {
    id: 'rss:volexity',
    adapter_type: 'rss',
    name: 'Volexity Threat Research',
    config: { url: 'https://www.volexity.com/blog/feed/' },
    tags: ['vendor', 'research', 'apt'],
  },
  {
    id: 'rss:eset-welivesecurity',
    adapter_type: 'rss',
    name: 'ESET WeLiveSecurity',
    config: { url: 'https://www.welivesecurity.com/feed/' },
    tags: ['vendor', 'research', 'apt', 'malware'],
  },

  // --- Research tools / OSINT --------------------------------------------
  {
    id: 'rss:malwarebytes-labs',
    adapter_type: 'rss',
    name: 'Malwarebytes Labs',
    config: { url: 'https://www.malwarebytes.com/blog/feed' },
    tags: ['vendor', 'research', 'malware', 'research-tools'],
  },
  {
    id: 'rss:sans-isc',
    adapter_type: 'rss',
    name: 'SANS Internet Storm Center Diaries',
    config: { url: 'https://isc.sans.edu/rssfeed_full.xml' },
    tags: ['research', 'research-tools'],
  },
];

/**
 * Build-time invariant: every category in `THREAT_CATEGORIES` must have
 * **at least two** seeded feeds. If a future PR drops below the threshold
 * we throw at plugin start so the regression is caught in dev, not in prod.
 *
 * Listed here rather than computed because some categories are intentionally
 * served by feeds tagged with related keywords (e.g. `extortion` covers
 * `ransomware`); the explicit map prevents drift.
 */
const REQUIRED_MIN_FEEDS_PER_CATEGORY = 2;
const CATEGORY_KEYWORDS: Record<ThreatCategory, readonly string[]> = {
  apt: ['apt'],
  malware: ['malware'],
  ransomware: ['ransomware', 'extortion'],
  vulnerability: ['vulnerability', 'advisories'],
  'data-breach': ['data-breach'],
  phishing: ['phishing'],
  cloud: ['cloud'],
  'supply-chain': ['supply-chain'],
  cybercrime: ['cybercrime'],
  'insider-threat': ['insider-threat'],
  iot: ['iot'],
  'ot-ics': ['ot-ics'],
  'government-policy': ['government-policy', 'government'],
  'privacy-compliance': ['privacy-compliance'],
  'research-tools': ['research-tools', 'research'],
};

export const verifyCategoryCoverage = (
  sources: readonly DefaultSource[] = DEFAULT_SOURCES
): void => {
  const gaps: string[] = [];
  for (const category of THREAT_CATEGORIES) {
    const keywords = CATEGORY_KEYWORDS[category];
    const matchCount = sources.filter((s) => s.tags.some((t) => keywords.includes(t))).length;
    if (matchCount < REQUIRED_MIN_FEEDS_PER_CATEGORY) {
      gaps.push(`${category} (only ${matchCount})`);
    }
  }
  if (gaps.length > 0) {
    throw new Error(
      `DEFAULT_SOURCES is missing >=${REQUIRED_MIN_FEEDS_PER_CATEGORY} feeds for: ${gaps.join(
        ', '
      )}`
    );
  }
};

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
  verifyCategoryCoverage();
  const now = new Date().toISOString();

  for (const src of DEFAULT_SOURCES) {
    try {
      const existing = await esClient.get(
        { index: THREAT_INTEL_SOURCES_INDEX, id: src.id },
        { ignore: [404] }
      );
      if (!existing.found) {
        await esClient.index({
          index: THREAT_INTEL_SOURCES_INDEX,
          id: src.id,
          document: {
            adapter_type: src.adapter_type,
            name: src.name,
            enabled: true,
            config: src.config,
            tags: src.tags,
            // Seeded sources are visible from every space; operator-added
            // sources are tagged with the originating space.
            space_id: GLOBAL_SPACE_ID,
            created_at: now,
            updated_at: now,
          },
        });
        log.debug(`Seeded default source ${src.id}`);
      }
    } catch (err) {
      log.warn(`Failed to seed default source ${src.id}: ${(err as Error).message}`);
    }
  }
};
