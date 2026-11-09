/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { countGateScopeAlerts, GATE_SCOPE_MIN_LOOKBACK } from '.';

describe('countGateScopeAlerts', () => {
  const alertsIndexPattern = '.alerts-security.alerts-default';
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  const getCountRequest = (): Record<string, unknown> =>
    (esClient.count as unknown as jest.Mock).mock.calls[0][0];
  const getShouldRanges = (): unknown[] =>
    (
      getCountRequest() as {
        query: { bool: { filter: Array<{ bool?: { should: unknown[] } }> } };
      }
    ).query.bool.filter.flatMap((clause) => clause.bool?.should ?? []);

  beforeEach(() => {
    jest.clearAllMocks();

    (esClient.count as unknown as jest.Mock).mockResolvedValue({
      _shards: { failed: 0, skipped: 0, successful: 1, total: 1 },
      count: 7,
    });
  });

  it('returns the count from Elasticsearch', async () => {
    await expect(countGateScopeAlerts({ alertsIndexPattern, esClient })).resolves.toBe(7);
  });

  it('counts the alerts index', async () => {
    await countGateScopeAlerts({ alertsIndexPattern, esClient });

    expect(getCountRequest().index).toBe(alertsIndexPattern);
  });

  it('treats a missing alerts index as zero alerts instead of an error', async () => {
    await countGateScopeAlerts({ alertsIndexPattern, esClient });

    expect(getCountRequest()).toEqual(
      expect.objectContaining({ allow_no_indices: true, ignore_unavailable: true })
    );
  });

  it('counts only open and acknowledged alerts', async () => {
    await countGateScopeAlerts({ alertsIndexPattern, esClient });

    expect(JSON.stringify(getCountRequest())).toContain(
      '{"terms":{"kibana.alert.workflow_status":["open","acknowledged"]}}'
    );
  });

  it('excludes building block alerts', async () => {
    await countGateScopeAlerts({ alertsIndexPattern, esClient });

    expect(JSON.stringify(getCountRequest())).toContain(
      '"must_not":[{"exists":{"field":"kibana.alert.building_block_type"}}]'
    );
  });

  it('counts alerts in the run time range or the minimum lookback', async () => {
    await countGateScopeAlerts({ alertsIndexPattern, end: 'now-1d', esClient, start: 'now-2d' });

    expect(getShouldRanges()).toEqual([
      {
        range: {
          '@timestamp': { format: 'strict_date_optional_time', gte: 'now-2d', lte: 'now-1d' },
        },
      },
      { range: { '@timestamp': { gte: GATE_SCOPE_MIN_LOOKBACK } } },
    ]);
  });

  it('uses the last 7 days as the minimum lookback', () => {
    expect(GATE_SCOPE_MIN_LOOKBACK).toBe('now-7d');
  });

  it('defaults the run time range to the last 24 hours', async () => {
    await countGateScopeAlerts({ alertsIndexPattern, esClient });

    expect(getShouldRanges()[0]).toEqual({
      range: { '@timestamp': { format: 'strict_date_optional_time', gte: 'now-24h', lte: 'now' } },
    });
  });

  it('does not apply any other filter', async () => {
    await countGateScopeAlerts({ alertsIndexPattern, esClient });

    expect(
      (getCountRequest() as { query: { bool: { filter: unknown[] } } }).query.bool.filter
    ).toHaveLength(2);
  });

  it('does not request documents, fields, or sorting', async () => {
    await countGateScopeAlerts({ alertsIndexPattern, esClient });

    expect(Object.keys(getCountRequest()).sort()).toEqual([
      'allow_no_indices',
      'ignore_unavailable',
      'index',
      'query',
    ]);
  });

  it('throws when a shard fails, so a partial count is not mistaken for zero', async () => {
    (esClient.count as unknown as jest.Mock).mockResolvedValue({
      _shards: { failed: 1, skipped: 0, successful: 1, total: 2 },
      count: 0,
    });

    await expect(countGateScopeAlerts({ alertsIndexPattern, esClient })).rejects.toThrow(
      '1 of 2 shard(s) failed'
    );
  });

  it('propagates Elasticsearch errors to the caller', async () => {
    (esClient.count as unknown as jest.Mock).mockRejectedValue(new Error('boom'));

    await expect(countGateScopeAlerts({ alertsIndexPattern, esClient })).rejects.toThrow('boom');
  });
});
