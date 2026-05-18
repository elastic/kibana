/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildDigestReportTableAttachmentId,
  formatTimeRangeLabel,
  mapSearchReportHitToTableRow,
} from './threat_intel_attachment_utils';

describe('threat_intel_attachment_utils', () => {
  it('maps a search_reports hit into a report-table row', () => {
    expect(
      mapSearchReportHitToTableRow({
        report_id: 'abc123',
        content: { title: 'TanStack supply chain attack' },
        source: { type: 'rss', name: 'The Hacker News', url: 'https://example.com/a' },
        severity: { level: 'high', score: 80 },
        extracted: { ttps: { techniques: ['T1195', 'T1078'] } },
      })
    ).toEqual({
      report_id: 'abc123',
      title: 'TanStack supply chain attack',
      source: { type: 'rss', name: 'The Hacker News', url: 'https://example.com/a' },
      severity: 'high',
      techniques: ['T1195', 'T1078'],
      iocs: [],
    });
  });

  it('formats a weekly time range label', () => {
    expect(formatTimeRangeLabel({ from: 'now-7d', to: 'now' })).toBe('Last 7 days');
  });

  it('builds a stable digest attachment id for the same query', () => {
    const params = {
      query: 'ransomware supply chain',
      time_range: { from: 'now-7d', to: 'now' },
      sort_by: 'rank' as const,
    };
    expect(buildDigestReportTableAttachmentId(params)).toBe(
      buildDigestReportTableAttachmentId(params)
    );
  });
});
