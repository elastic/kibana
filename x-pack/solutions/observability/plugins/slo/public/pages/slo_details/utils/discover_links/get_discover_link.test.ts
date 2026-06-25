/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { getApmTracesDiscoverUrl } from './get_discover_link';

describe('getApmTracesDiscoverUrl', () => {
  const mockGetRedirectUrl = jest.fn(
    (params: Record<string, unknown>) => `https://discover?${JSON.stringify(params)}`
  );

  const mockShare = {
    url: {
      locators: {
        get: jest.fn((id: string) =>
          id === DISCOVER_APP_LOCATOR ? { getRedirectUrl: mockGetRedirectUrl } : undefined
        ),
      },
    },
  } as unknown as SharePluginStart;

  const baseParams = {
    index: 'traces-apm*,apm-*',
    serviceName: 'my-service',
    environment: 'production',
    transactionType: 'request',
    transactionName: 'GET /api/data',
  };

  const timeRange = { from: 'now-30d', to: 'now' };

  const getGeneratedEsqlQuery = (): string => {
    const locatorParams = mockGetRedirectUrl.mock.calls[0][0] as { query: { esql: string } };
    return locatorParams.query.esql;
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns undefined when Discover locator is not available', () => {
    const emptyShare = {
      url: { locators: { get: () => undefined } },
    } as unknown as SharePluginStart;

    const result = getApmTracesDiscoverUrl({
      params: baseParams,
      share: emptyShare,
      timeRange,
    });

    expect(result).toBeUndefined();
  });

  it('builds ES|QL query with all filters when all params are provided', () => {
    getApmTracesDiscoverUrl({ params: baseParams, share: mockShare, timeRange });

    expect(mockGetRedirectUrl).toHaveBeenCalledTimes(1);
    const esqlQuery = getGeneratedEsqlQuery();

    expect(esqlQuery).toContain('FROM traces-apm*, apm-*');
    expect(esqlQuery).toContain('`service.name` == "my-service"');
    expect(esqlQuery).toContain('`service.environment` == "production"');
    expect(esqlQuery).toContain('`transaction.type` == "request"');
    expect(esqlQuery).toContain('`transaction.name` == "GET /api/data"');
    expect(esqlQuery).toContain('SORT @timestamp DESC');
  });

  it('omits WHERE clauses for fields set to ALL_VALUE', () => {
    getApmTracesDiscoverUrl({
      params: {
        ...baseParams,
        environment: ALL_VALUE,
        transactionName: ALL_VALUE,
      },
      share: mockShare,
      timeRange,
    });

    const esqlQuery = getGeneratedEsqlQuery();

    expect(esqlQuery).toContain('`service.name` == "my-service"');
    expect(esqlQuery).toContain('`transaction.type` == "request"');
    expect(esqlQuery).not.toContain('service.environment');
    expect(esqlQuery).not.toContain('transaction.name');
  });

  it('produces only FROM and SORT when all fields are ALL_VALUE', () => {
    getApmTracesDiscoverUrl({
      params: {
        index: 'traces-apm*',
        serviceName: ALL_VALUE,
        environment: ALL_VALUE,
        transactionType: ALL_VALUE,
        transactionName: ALL_VALUE,
      },
      share: mockShare,
      timeRange,
    });

    const esqlQuery = getGeneratedEsqlQuery();

    expect(esqlQuery).toContain('FROM traces-apm*');
    expect(esqlQuery).toContain('SORT @timestamp DESC');
    expect(esqlQuery).not.toContain('WHERE');
  });

  it('passes the time range to the locator', () => {
    const customRange = { from: '2024-01-01', to: '2024-01-31' };
    getApmTracesDiscoverUrl({ params: baseParams, share: mockShare, timeRange: customRange });

    expect(mockGetRedirectUrl).toHaveBeenCalledWith(
      expect.objectContaining({ timeRange: customRange })
    );
  });
});
