/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, throwError } from 'rxjs';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { HAS_RUM_DATA_TIERS } from '../../../services/data/has_rum_data_query';
import { callApmApi } from '../../../services/rest/create_call_apm_api';
import { hasRumData } from './ux_overview_fetchers';

jest.mock('../../../services/rest/create_call_apm_api', () => ({
  callApmApi: jest.fn(),
}));

const callApmApiMock = callApmApi as jest.Mock;
const INDEX = 'apm-*';
const TIER_CLAUSE = { terms: { _tier: HAS_RUM_DATA_TIERS } };

const hits = (value: number, serviceName?: string) => ({
  hits: { total: { value, relation: 'eq' as const } },
  aggregations: {
    services: {
      mostTraffic: { buckets: serviceName ? [{ key: serviceName }] : [] },
    },
  },
});

interface SearchRequest {
  params: {
    index?: string;
    query: { bool: { filter: unknown[] } };
    aggs?: unknown;
    terminate_after?: number;
  };
}

const isTiered = (request: SearchRequest) =>
  request.params.query.bool.filter.some(
    (clause) => JSON.stringify(clause) === JSON.stringify(TIER_CLAUSE)
  );

const makeDataPlugin = (responses: {
  tiered: ReturnType<typeof hits>;
  unbounded: ReturnType<typeof hits>;
}) => {
  const search = jest.fn((request: SearchRequest) =>
    of({
      rawResponse: isTiered(request) ? responses.tiered : responses.unbounded,
    })
  );

  return {
    plugin: { search: { search } } as unknown as DataPublicPluginStart,
    search,
  };
};

beforeEach(() => {
  callApmApiMock.mockResolvedValue({ apmDataViewIndexPattern: INDEX });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('hasRumData', () => {
  const absoluteTime = { start: 0, end: 50000 };

  it('returns the tier restricted result when it has data and a service name', async () => {
    const { plugin, search } = makeDataPlugin({
      tiered: hits(1, 'client'),
      unbounded: hits(9, 'other'),
    });

    await expect(hasRumData({ dataStartPlugin: plugin, absoluteTime })).resolves.toEqual({
      hasData: true,
      serviceName: 'client',
      indices: INDEX,
    });

    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0][0].params.aggs).toBeDefined();
    expect(search.mock.calls[0][0].params).not.toHaveProperty('terminate_after');
    expect(search.mock.calls[0][0].params.query.bool.filter).toContainEqual(TIER_CLAUSE);
  });

  it('falls back when the tier restricted result has data but no service name', async () => {
    const { plugin, search } = makeDataPlugin({
      tiered: hits(1),
      unbounded: hits(4, 'frozen-app'),
    });

    await expect(hasRumData({ dataStartPlugin: plugin, absoluteTime })).resolves.toEqual({
      hasData: true,
      serviceName: 'frozen-app',
      indices: INDEX,
    });

    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[1][0].params.query.bool.filter).not.toContainEqual(TIER_CLAUSE);
  });

  it('falls back when the tier restricted result has no data', async () => {
    const { plugin, search } = makeDataPlugin({
      tiered: hits(0),
      unbounded: hits(2, 'cold-app'),
    });

    await expect(hasRumData({ dataStartPlugin: plugin, absoluteTime })).resolves.toEqual({
      hasData: true,
      serviceName: 'cold-app',
      indices: INDEX,
    });

    expect(search).toHaveBeenCalledTimes(2);
  });

  it('returns no data when neither query finds any', async () => {
    const { plugin, search } = makeDataPlugin({
      tiered: hits(0),
      unbounded: hits(0),
    });

    await expect(hasRumData({ dataStartPlugin: plugin, absoluteTime })).resolves.toEqual({
      hasData: false,
      serviceName: undefined,
      indices: INDEX,
    });

    expect(search).toHaveBeenCalledTimes(2);
  });

  it('rejects when the tier restricted query fails, rather than falling back', async () => {
    const search = jest.fn(() => throwError(() => new Error('search failed')));
    const plugin = { search: { search } } as unknown as DataPublicPluginStart;

    await expect(hasRumData({ dataStartPlugin: plugin, absoluteTime })).rejects.toThrow(
      'search failed'
    );
    // Unlike the in-app hook, a failed cheap pass here surfaces to the caller instead of being
    // retried without the tier filter.
    expect(search).toHaveBeenCalledTimes(1);
  });
});
