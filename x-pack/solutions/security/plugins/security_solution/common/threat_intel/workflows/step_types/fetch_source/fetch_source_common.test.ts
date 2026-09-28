/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GLOBAL_SPACE_ID } from '../../../constants';
import { CATALOG_SOURCE_URLS } from '../../../catalog_source_urls';
import { normalizedReportSchema, sourceHitSchema } from './fetch_source_common';

const buildTitleOnlyReport = (): Record<string, unknown> => ({
  '@timestamp': '2026-09-01T00:00:00.000Z',
  content_fingerprint: 'fp-title-only',
  space_id: 'default',
  source: {
    type: 'rss',
    name: 'Example Feed',
    url: 'https://example.test/feed.xml',
    adapter_id: 'rss:example',
  },
  content: {
    title: 'Threat headline with no body',
    body_text: 'Threat headline with no body',
  },
  severity: { level: 'medium', score: 0.5 },
  lineage: { ingested_at: '2026-09-01T00:00:00.000Z', extraction_method: 'pending' },
});

describe('normalizedReportSchema', () => {
  it('accepts a title-only report without storing fallback metadata', () => {
    const parsed = normalizedReportSchema.parse(buildTitleOnlyReport());

    expect(parsed.content.body_text).toBe('Threat headline with no body');
  });

  it('accepts a report whose adapter could not establish safe provenance', () => {
    const report = buildTitleOnlyReport();
    report.source = {
      type: 'rss',
      name: 'Example Feed',
      adapter_id: 'rss:example',
    };

    expect(normalizedReportSchema.parse(report).source.url).toBeUndefined();
  });
});

describe('sourceHitSchema', () => {
  it('accepts a seeded catalog hit without a persisted config field', () => {
    const sourceId = 'vendor_api:elastic-security-labs';
    const parsed = sourceHitSchema.parse({
      _id: sourceId,
      _index: '.kibana-threat-intel-sources',
      _source: {
        adapter_type: 'rss',
        name: 'Elastic Security Labs',
        enabled: true,
        tags: ['vendor', 'elastic', 'research', 'research-tools'],
        space_id: GLOBAL_SPACE_ID,
      },
    });

    expect(parsed._id).toBe(sourceId);
    expect(parsed._source).not.toHaveProperty('config');
    expect(CATALOG_SOURCE_URLS[sourceId]).toBe('https://www.elastic.co/security-labs/rss/feed.xml');
  });
});
