/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import {
  APM_SOURCE_FIELDS,
  getApmSourceFieldLink,
  getResolvedApmParams,
} from './get_apm_source_field_link';
import { buildSlo } from '../../data/slo/slo';
import { buildApmAvailabilityIndicator } from '../../data/slo/indicator';

const mockLocator = {
  getRedirectUrl: jest.fn((params: Record<string, unknown>) => JSON.stringify(params)),
};

const baseArgs = {
  apmLocator: mockLocator,
  serviceName: 'my-service',
  timeRange: { from: 'now-30d', to: 'now' },
};

describe('getResolvedApmParams', () => {
  it('returns indicator params when no groupings exist', () => {
    const slo = buildSlo({ indicator: buildApmAvailabilityIndicator() });
    const result = getResolvedApmParams(slo);

    expect(result).toEqual({
      serviceName: 'o11y-app',
      environment: 'development',
      transactionType: 'request',
      transactionName: 'GET /flaky',
    });
  });

  it('prefers groupings values over indicator params', () => {
    const slo = buildSlo({
      indicator: buildApmAvailabilityIndicator(),
      groupings: {
        'service.name': 'grouped-service',
        'service.environment': 'staging',
      },
    });

    const result = getResolvedApmParams(slo);

    expect(result).toEqual({
      serviceName: 'grouped-service',
      environment: 'staging',
      transactionType: 'request',
      transactionName: 'GET /flaky',
    });
  });

  it('falls back to indicator params when groupings are absent', () => {
    const slo = buildSlo({
      indicator: buildApmAvailabilityIndicator(),
      groupings: {},
    });

    const result = getResolvedApmParams(slo);

    expect(result).toEqual({
      serviceName: 'o11y-app',
      environment: 'development',
      transactionType: 'request',
      transactionName: 'GET /flaky',
    });
  });
});

describe('getApmSourceFieldLink', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns undefined when locator is not found', () => {
    expect(
      getApmSourceFieldLink({
        ...baseArgs,
        apmLocator: undefined,
        field: APM_SOURCE_FIELDS.SERVICE_NAME,
        value: 'my-service',
      })
    ).toBeUndefined();
  });

  it('returns undefined when serviceName is ALL_VALUE', () => {
    expect(
      getApmSourceFieldLink({
        ...baseArgs,
        apmLocator: mockLocator,
        serviceName: ALL_VALUE,
        field: APM_SOURCE_FIELDS.SERVICE_NAME,
        value: ALL_VALUE,
      })
    ).toBeUndefined();
    expect(mockLocator.getRedirectUrl).not.toHaveBeenCalled();
  });

  it('returns a base link for service.name', () => {
    const result = getApmSourceFieldLink({
      ...baseArgs,
      apmLocator: mockLocator,
      field: APM_SOURCE_FIELDS.SERVICE_NAME,
      value: 'my-service',
    });

    expect(mockLocator.getRedirectUrl).toHaveBeenCalledWith({
      serviceName: 'my-service',
      query: {
        environment: 'ENVIRONMENT_ALL',
        rangeFrom: 'now-30d',
        rangeTo: 'now',
      },
    });
    expect(result).toBeDefined();
  });

  it('includes environment filter for service.environment', () => {
    getApmSourceFieldLink({
      ...baseArgs,
      apmLocator: mockLocator,
      field: APM_SOURCE_FIELDS.SERVICE_ENVIRONMENT,
      value: 'production',
    });

    expect(mockLocator.getRedirectUrl).toHaveBeenCalledWith({
      serviceName: 'my-service',
      query: {
        environment: 'production',
        rangeFrom: 'now-30d',
        rangeTo: 'now',
      },
    });
  });

  it('includes transactionType filter for transaction.type', () => {
    getApmSourceFieldLink({
      ...baseArgs,
      apmLocator: mockLocator,
      field: APM_SOURCE_FIELDS.TRANSACTION_TYPE,
      value: 'request',
    });

    expect(mockLocator.getRedirectUrl).toHaveBeenCalledWith({
      serviceName: 'my-service',
      query: {
        environment: 'ENVIRONMENT_ALL',
        transactionType: 'request',
        rangeFrom: 'now-30d',
        rangeTo: 'now',
      },
    });
  });

  it('includes transactionName and serviceOverviewTab for transaction.name', () => {
    getApmSourceFieldLink({
      ...baseArgs,
      apmLocator: mockLocator,
      field: APM_SOURCE_FIELDS.TRANSACTION_NAME,
      value: 'GET /api/checkout',
    });

    expect(mockLocator.getRedirectUrl).toHaveBeenCalledWith({
      serviceName: 'my-service',
      serviceOverviewTab: 'transactions',
      query: {
        environment: 'ENVIRONMENT_ALL',
        transactionName: 'GET /api/checkout',
        rangeFrom: 'now-30d',
        rangeTo: 'now',
      },
    });
  });

  it('uses the provided time range', () => {
    getApmSourceFieldLink({
      ...baseArgs,
      timeRange: { from: '2024-01-01', to: '2024-01-31' },
      apmLocator: mockLocator,
      field: APM_SOURCE_FIELDS.SERVICE_NAME,
      value: 'my-service',
    });

    expect(mockLocator.getRedirectUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          rangeFrom: '2024-01-01',
          rangeTo: '2024-01-31',
        }),
      })
    );
  });
});
