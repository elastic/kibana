/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatCatalogContextForPrompt } from './format_catalog_context';
import type { DataSourceEntry } from '@kbn/data-source-catalog';

const mockEntry: DataSourceEntry = {
  id: 'data_stream::logs-endpoint.events.process-default',
  name: 'logs-endpoint.events.process-default',
  type: 'data_stream',
  mapping: {
    fields: [
      { name: 'process.name', type: 'keyword', ecs: true, searchable: true, aggregatable: true },
      { name: 'process.pid', type: 'long', ecs: true, searchable: true, aggregatable: true },
    ],
    total_field_count: 150,
    ecs_field_count: 120,
    ecs_field_coverage: 0.8,
  },
  integration: {
    package_name: 'endpoint',
    package_title: 'Elastic Defend',
    package_version: '9.0.0',
    dataset: 'endpoint.events.process',
    description: 'Collect process events from Elastic Defend',
    data_stream_title: 'Process Events',
  },
  stats: {
    doc_count: 500000,
    size_bytes: 1073741824,
    last_ingested_at: '2026-03-26T12:00:00.000Z',
    is_active: true,
    freshness_category: 'live',
  },
  catalog_version: 1,
  refreshed_at: '2026-03-26T00:00:00.000Z',
};

describe('formatCatalogContextForPrompt', () => {
  it('formats entries into a readable context block', () => {
    const result = formatCatalogContextForPrompt([mockEntry]);
    expect(result).toContain('## Available Data Sources');
    expect(result).toContain('logs-endpoint.events.process-default');
    expect(result).toContain('Elastic Defend');
    expect(result).toContain('process.name');
    expect(result).toContain('500,000 docs');
  });

  it('returns empty string for no entries', () => {
    expect(formatCatalogContextForPrompt([])).toBe('');
  });

  it('limits entries to maxEntries', () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({
      ...mockEntry,
      id: `test-${i}`,
      name: `test-index-${i}`,
    }));
    const result = formatCatalogContextForPrompt(entries, 5);
    expect(result).toContain('test-index-0');
    expect(result).toContain('test-index-4');
    expect(result).not.toContain('test-index-5');
  });
});
