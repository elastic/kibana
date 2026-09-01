/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NormalizedReport } from './fetch_source_common';
import { normalizedReportSchema } from './fetch_source_common';

const buildTitleOnlyReport = (
  overrides: Partial<NormalizedReport['content']> = {}
): Record<string, unknown> => ({
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
    // Title-only feed entry: body_text is the title, so the adapter marks it.
    body_text: 'Threat headline with no body',
    body_is_title_fallback: true,
    ...overrides,
  },
  severity: { level: 'medium', score: 0.5 },
  lineage: { ingested_at: '2026-09-01T00:00:00.000Z', extraction_method: 'pending' },
});

describe('normalizedReportSchema', () => {
  it('preserves body_is_title_fallback for a title-only report', () => {
    const parsed = normalizedReportSchema.parse(buildTitleOnlyReport());

    // Without the field in the contract, zod would strip it here and the strict
    // mapping would never receive the marker.
    expect(parsed.content.body_is_title_fallback).toBe(true);
  });

  it('leaves body_is_title_fallback undefined when the adapter omits it', () => {
    const report = buildTitleOnlyReport();
    delete (report.content as Record<string, unknown>).body_is_title_fallback;

    const parsed = normalizedReportSchema.parse(report);

    expect(parsed.content.body_is_title_fallback).toBeUndefined();
  });

  it('rejects a non-boolean body_is_title_fallback', () => {
    const report = buildTitleOnlyReport();
    (report.content as Record<string, unknown>).body_is_title_fallback = 'yes';

    expect(() => normalizedReportSchema.parse(report)).toThrow();
  });
});
