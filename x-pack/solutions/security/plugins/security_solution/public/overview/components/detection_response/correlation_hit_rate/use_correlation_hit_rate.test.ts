/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { ALERTS_QUERY_NAMES } from '../../../../detections/containers/detection_engine/alerts/constants';
import type { UseCorrelationHitRate, UseCorrelationHitRateProps } from './use_correlation_hit_rate';
import { useCorrelationHitRate } from './use_correlation_hit_rate';
import type { ESBoolQuery } from '../../../../../common/typed_json';

const dateNow = new Date('2024-01-15T12:00:00.000Z').valueOf();
const mockDateNow = jest.fn().mockReturnValue(dateNow);
Date.now = jest.fn(() => mockDateNow()) as unknown as DateConstructor['now'];

const from = '2024-01-01T00:00:00.000Z';
const to = '2024-01-02T00:00:00.000Z';

const defaultUseQueryAlertsReturn = {
  loading: false,
  data: null,
  setQuery: jest.fn(),
  response: '',
  request: '',
  refetch: jest.fn(),
};

const mockUseQueryAlerts = jest.fn().mockReturnValue(defaultUseQueryAlertsReturn);
jest.mock('../../../../detections/containers/detection_engine/alerts/use_query', () => ({
  useQueryAlerts: (...props: unknown[]) => mockUseQueryAlerts(...props),
}));

const mockUseGlobalTime = jest
  .fn()
  .mockReturnValue({ from, to, setQuery: jest.fn(), deleteQuery: jest.fn() });
jest.mock('../../../../common/containers/use_global_time', () => ({
  useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
}));

jest.mock('../../../../common/components/page/manage_query', () => ({
  useQueryInspector: jest.fn(),
}));

const renderUseCorrelationHitRate = (overrides: Partial<UseCorrelationHitRateProps> = {}) =>
  renderHook<ReturnType<UseCorrelationHitRate>, UseCorrelationHitRateProps>(() =>
    useCorrelationHitRate({
      queryId: 'test-correlation',
      signalIndexName: 'signal-alerts',
      ...overrides,
    })
  );

const mockAggregations = {
  alertsByRule: {
    buckets: [
      {
        key: 'Lateral Movement Correlation',
        doc_count: 42,
        lastSeen: { value_as_string: '2024-01-02T10:30:00.000Z' },
        lastAlert: {
          hits: {
            hits: [{ fields: { 'kibana.alert.rule.uuid': ['rule-uuid-111'] } }],
          },
        },
      },
      {
        key: 'Brute Force Correlation',
        doc_count: 7,
        lastSeen: { value_as_string: '2024-01-01T18:00:00.000Z' },
        lastAlert: {
          hits: {
            hits: [{ fields: { 'kibana.alert.rule.uuid': ['rule-uuid-222'] } }],
          },
        },
      },
    ],
  },
};

const expectedQuery = {
  _source: false,
  fields: ['kibana.alert.rule.name', 'kibana.alert.rule.uuid', '@timestamp'],
  size: 0,
  query: {
    bool: {
      filter: [
        { term: { 'kibana.alert.rule.type': 'siem.correlationRule' } },
        { range: { '@timestamp': { gte: from, lte: to } } },
      ],
    },
  },
  aggs: {
    alertsByRule: {
      terms: {
        field: 'kibana.alert.rule.name',
        size: 10,
        order: { _count: 'desc' },
      },
      aggs: {
        lastSeen: {
          max: { field: '@timestamp' },
        },
        lastAlert: {
          top_hits: {
            size: 1,
            sort: { '@timestamp': 'desc' },
            _source: false,
            fields: ['kibana.alert.rule.uuid'],
          },
        },
      },
    },
  },
};

describe('useCorrelationHitRate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDateNow.mockReturnValue(dateNow);
    mockUseQueryAlerts.mockReturnValue(defaultUseQueryAlertsReturn);
  });

  it('should return empty items when data is null', () => {
    const { result } = renderUseCorrelationHitRate();

    expect(result.current).toEqual({
      items: [],
      isLoading: false,
      updatedAt: dateNow,
    });
  });

  it('should pass correct query structure to useQueryAlerts', () => {
    renderUseCorrelationHitRate();

    expect(mockUseQueryAlerts).toHaveBeenCalledWith({
      query: expectedQuery,
      indexName: 'signal-alerts',
      skip: false,
      queryName: ALERTS_QUERY_NAMES.CORRELATION_ALERTS,
    });
  });

  it('should return parsed items from aggregation buckets', () => {
    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: { aggregations: mockAggregations },
    });

    const { result } = renderUseCorrelationHitRate();

    expect(result.current).toEqual({
      items: [
        {
          id: 'rule-uuid-111',
          name: 'Lateral Movement Correlation',
          alertCount: 42,
          lastSeen: '2024-01-02T10:30:00.000Z',
        },
        {
          id: 'rule-uuid-222',
          name: 'Brute Force Correlation',
          alertCount: 7,
          lastSeen: '2024-01-01T18:00:00.000Z',
        },
      ],
      isLoading: false,
      updatedAt: dateNow,
    });
  });

  it('should respect skip flag', () => {
    const { result } = renderUseCorrelationHitRate({ skip: true });

    expect(mockUseQueryAlerts).toHaveBeenCalledWith(expect.objectContaining({ skip: true }));

    expect(result.current).toEqual({
      items: [],
      isLoading: false,
      updatedAt: dateNow,
    });
  });

  it('should handle missing aggregations gracefully', () => {
    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: { aggregations: undefined },
    });

    const { result } = renderUseCorrelationHitRate();

    expect(result.current).toEqual({
      items: [],
      isLoading: false,
      updatedAt: dateNow,
    });
  });

  it('should handle empty buckets', () => {
    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: { aggregations: { alertsByRule: { buckets: [] } } },
    });

    const { result } = renderUseCorrelationHitRate();

    expect(result.current).toEqual({
      items: [],
      isLoading: false,
      updatedAt: dateNow,
    });
  });

  it('should add filterQuery to query', () => {
    const filterQuery: ESBoolQuery = {
      bool: {
        filter: [{ match_phrase: { 'host.name': 'test-host' } }],
        must: [],
        must_not: [],
        should: [],
      },
    };

    renderUseCorrelationHitRate({ filterQuery });

    expect(mockUseQueryAlerts.mock.calls[0][0].query.query.bool.filter).toContain(filterQuery);
  });

  it('should return new updatedAt when data changes', () => {
    const newDateNow = new Date('2024-01-15T14:00:00.000Z').valueOf();
    mockDateNow.mockReturnValue(newDateNow);
    mockDateNow.mockReturnValueOnce(dateNow);
    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: { aggregations: mockAggregations },
    });

    const { result } = renderUseCorrelationHitRate();

    expect(mockDateNow).toHaveBeenCalled();
    expect(result.current).toEqual({
      items: expect.any(Array),
      isLoading: false,
      updatedAt: newDateNow,
    });
  });
});
