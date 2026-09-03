/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APPROVED_CATALOG_SOURCE_IDS } from './constants';

/**
 * Public feed URLs for the fixed, code-authoritative source catalog.
 *
 * These are not persisted in `.kibana-threat-intel-sources`. The sources index
 * holds metadata only (`adapter_type`, `enabled`, `tags`, `space_id`). Adapters
 * and list routes resolve the fetch URL from this map by stable source id.
 */
export const CATALOG_SOURCE_URLS = {
  'kev:cisa-known-exploited-vulnerabilities':
    'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
  'vendor_api:elastic-security-labs': 'https://www.elastic.co/security-labs/rss/feed.xml',
  'rss:mandiant-research': 'https://cloud.google.com/security/blog/threat-intelligence/rss',
  'rss:unit42': 'https://unit42.paloaltonetworks.com/feed/',
  'rss:talos': 'https://blog.talosintelligence.com/rss/',
  'rss:crowdstrike': 'https://www.crowdstrike.com/blog/feed/',
  'rss:cisa-alerts': 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
  'text_indicator_list:maltrail-cobaltstrike':
    'https://raw.githubusercontent.com/stamparm/maltrail/master/trails/static/malware/cobaltstrike.txt',
  'rss:aws-security': 'https://aws.amazon.com/blogs/security/feed/',
  'rss:aws-security-bulletins': 'https://aws.amazon.com/security/security-bulletins/rss/feed/',
  'rss:fortiguard-advisories': 'https://filestore.fortinet.com/fortiguard/rss/ir.xml',
  'rss:fortiguard-threat-signal': 'https://filestore.fortinet.com/fortiguard/rss/threatsignal.xml',
} as const satisfies Record<(typeof APPROVED_CATALOG_SOURCE_IDS)[number], string>;

/** Returns the catalog fetch URL for a source id, if it is part of the approved set. */
export const resolveCatalogSourceUrl = (sourceId: string): string | undefined =>
  Object.hasOwn(CATALOG_SOURCE_URLS, sourceId)
    ? CATALOG_SOURCE_URLS[sourceId as keyof typeof CATALOG_SOURCE_URLS]
    : undefined;
