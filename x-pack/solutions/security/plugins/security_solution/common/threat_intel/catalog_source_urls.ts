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
  'vendor_api:elastic-security-labs': 'https://www.elastic.co/security-labs/rss/feed.xml',
  'rss:cisa-alerts': 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
  // Open Government Licence v3.0 (attribution required):
  // https://www.ncsc.gov.uk/section/about-this-website/terms-and-conditions
  // News only, by product decision. NCSC's aggregate feed (`all-rss-feed.xml`) is mostly
  // blog posts and guidance; the news feed is where exploitation and state-actor
  // advisories and incident notices land. Per-type siblings: `report-`, `guidance-`,
  // `blog-post-rss-feed.xml`.
  'rss:uk-ncsc': 'https://www.ncsc.gov.uk/api/1/services/v1/news-rss-feed.xml',
  // Licence Ouverte / Open Licence 2.0 (attribution required):
  // https://cert.cyber.gouv.fr/mentions-legales/
  // CERT-FR's IOC feed (`/ioc/feed/`) is deliberately not here: it has published nothing
  // since July 2024, and its entries are short summaries whose indicators live in linked
  // STIX/MISP attachments the RSS adapter never fetches.
  'rss:cert-fr-alerts': 'https://cert.cyber.gouv.fr/alerte/feed/',
  'rss:cert-fr-threats': 'https://cert.cyber.gouv.fr/cti/feed/',
  // CC BY 4.0 (attribution required): https://cert.europa.eu/legal-notice
  'rss:cert-eu-advisories': 'https://cert.europa.eu/publications/security-advisories-rss',
  'rss:cert-eu-threat-intelligence': 'https://cert.europa.eu/publications/threat-intelligence-rss',
} as const satisfies Record<(typeof APPROVED_CATALOG_SOURCE_IDS)[number], string>;

/** Returns the catalog fetch URL for a source id, if it is part of the approved set. */
export const resolveCatalogSourceUrl = (sourceId: string): string | undefined =>
  Object.hasOwn(CATALOG_SOURCE_URLS, sourceId)
    ? CATALOG_SOURCE_URLS[sourceId as keyof typeof CATALOG_SOURCE_URLS]
    : undefined;
