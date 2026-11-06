/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getToolHandler } from './handler';

const mockSearch = jest.fn().mockResolvedValue({ aggregations: { groups: { buckets: [] } } });

jest.mock('../../utils/build_apm_resources', () => ({
  buildApmResources: jest.fn().mockResolvedValue({
    apmEventClient: { search: (...args: unknown[]) => mockSearch(...args) },
    apmDataAccessServices: {},
  }),
}));

jest.mock('../../utils/get_preferred_document_source', () => ({
  getPreferredDocumentSource: jest.fn().mockResolvedValue({
    rollupInterval: '1m',
    hasDurationSummaryField: false,
    documentType: 'transactionMetric',
  }),
}));

const BASE_ARGS = {
  core: {} as any,
  plugins: {} as any,
  request: {} as any,
  logger: { debug: jest.fn(), error: jest.fn() } as any,
  groupBy: 'service.name',
  latencyType: 'avg' as const,
};

const THIRTY_MIN_MS = 30 * 60 * 1000;

describe('get_trace_change_points handler — 30-minute floor', () => {
  beforeEach(() => mockSearch.mockClear());

  it('extends start to 30 minutes before end when window is shorter', async () => {
    const end = new Date('2026-01-01T12:00:00.000Z');
    const start = new Date(end.getTime() - 10 * 60 * 1000); // 10 minutes before end

    await getToolHandler({
      ...BASE_ARGS,
      start: start.toISOString(),
      end: end.toISOString(),
    });

    const query = mockSearch.mock.calls[0][1].query.bool.filter[0];
    const effectiveStart = query.range['@timestamp'].gte;
    const expectedStart = end.getTime() - THIRTY_MIN_MS;

    expect(effectiveStart).toBe(expectedStart);
  });

  it('does not extend start when window is already 30 minutes or longer', async () => {
    const end = new Date('2026-01-01T12:00:00.000Z');
    const start = new Date(end.getTime() - 45 * 60 * 1000); // 45 minutes before end

    await getToolHandler({
      ...BASE_ARGS,
      start: start.toISOString(),
      end: end.toISOString(),
    });

    const query = mockSearch.mock.calls[0][1].query.bool.filter[0];
    const effectiveStart = query.range['@timestamp'].gte;

    expect(effectiveStart).toBe(start.getTime());
  });
});
