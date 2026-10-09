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
} as const satisfies Record<(typeof APPROVED_CATALOG_SOURCE_IDS)[number], string>;

/** Returns the catalog fetch URL for a source id, if it is part of the approved set. */
export const resolveCatalogSourceUrl = (sourceId: string): string | undefined =>
  Object.hasOwn(CATALOG_SOURCE_URLS, sourceId)
    ? CATALOG_SOURCE_URLS[sourceId as keyof typeof CATALOG_SOURCE_URLS]
    : undefined;
