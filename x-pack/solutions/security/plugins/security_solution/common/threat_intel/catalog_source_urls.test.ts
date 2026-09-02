/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APPROVED_CATALOG_SOURCE_IDS } from './constants';
import { CATALOG_SOURCE_URLS, resolveCatalogSourceUrl } from './catalog_source_urls';

describe('CATALOG_SOURCE_URLS', () => {
  it('defines a URL for every approved catalog source id', () => {
    expect(Object.keys(CATALOG_SOURCE_URLS).sort()).toEqual(
      [...APPROVED_CATALOG_SOURCE_IDS].sort()
    );
  });

  it('returns undefined for ids outside the approved catalog', () => {
    expect(resolveCatalogSourceUrl('rss:unknown')).toBeUndefined();
  });

  it('returns undefined for Object.prototype names so they are not treated as catalog ids', () => {
    expect(resolveCatalogSourceUrl('toString')).toBeUndefined();
  });

  it('returns the catalog URL for an approved source id', () => {
    expect(resolveCatalogSourceUrl('vendor_api:elastic-security-labs')).toBe(
      'https://www.elastic.co/security-labs/rss/feed.xml'
    );
  });
});
