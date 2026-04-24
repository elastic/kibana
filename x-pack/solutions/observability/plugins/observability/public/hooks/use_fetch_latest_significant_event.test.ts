/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { of } from 'rxjs';
import { kibanaStartMock } from '../utils/kibana_react.mock';
import { useFetchLatestSignificantEvent } from './use_fetch_latest_significant_event';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();
const mockSearch = mockUseKibanaReturnValue.services.data.search.search as jest.Mock;

jest.mock('../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const createMockDocument = (overrides = {}) => ({
  '@timestamp': '2024-01-15T10:00:00.000Z',
  event_id: 'event-123',
  discovery_id: 'discovery-456',
  discovery_slug: 'test-discovery',
  verdict: 'promoted' as const,
  title: 'Test Significant Event',
  summary: 'This is a test summary',
  root_cause: 'Database connection timeout',
  rule_names: ['rule-1', 'rule-2'],
  stream_names: ['logs', 'checkout'],
  blast_radius: [
    { ki_id: 'service-1', name: 'payment-service', stream_name: 'logs', confirmed: true },
    { ki_id: 'service-2', name: 'checkout-service', stream_name: 'logs', confirmed: true },
    { ki_id: 'service-3', name: 'inventory-service', stream_name: 'logs', confirmed: false },
  ],
  cause_kis: [
    { ki_id: 'cause-1', name: 'db-connection-pool', stream_name: 'metrics', confirmed: true },
    { ki_id: 'cause-2', name: 'network-latency', stream_name: 'metrics', confirmed: false },
  ],
  criticality: 85,
  recommended_action: 'escalate' as const,
  impact: 'critical' as const,
  recommendations: ['Restart the database', 'Check network connectivity'],
  verdict_id: 'verdict-789',
  last_reviewed_at: '2024-01-15T09:55:00.000Z',
  ...overrides,
});

const createMockSearchResponse = (doc: ReturnType<typeof createMockDocument> | null) => ({
  rawResponse: {
    hits: {
      hits: doc ? [{ _source: doc }] : [],
    },
  },
});

describe('useFetchLatestSignificantEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('returns loading true initially', () => {
      mockSearch.mockReturnValue(of(createMockSearchResponse(createMockDocument())));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('successful fetch', () => {
    it('returns transformed data when document is found', async () => {
      const mockDoc = createMockDocument();
      mockSearch.mockReturnValue(of(createMockSearchResponse(mockDoc)));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBeNull();
      expect(result.current.data).not.toBeNull();
      expect(result.current.data?.mainEventTitle).toBe('Test Significant Event');
      expect(result.current.data?.description).toBe('This is a test summary');
      expect(result.current.data?.blastRadiusScore).toBe(85);
      expect(result.current.data?.state).toBe('critical');
      expect(result.current.data?.severityLabel).toBe('Critical');
      expect(result.current.data?.severityColor).toBe('danger');
    });

    it('returns null data when no documents found', async () => {
      mockSearch.mockReturnValue(of(createMockSearchResponse(null)));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBeNull();
      expect(result.current.data).toBeNull();
    });

    it('returns null data when _source is undefined', async () => {
      mockSearch.mockReturnValue(
        of({
          rawResponse: {
            hits: {
              hits: [{ _source: undefined }],
            },
          },
        })
      );

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data).toBeNull();
    });
  });

  describe('impact to severity mapping', () => {
    it.each([
      {
        impact: 'critical',
        expectedLabel: 'Critical',
        expectedColor: 'danger',
        expectedState: 'critical',
      },
      { impact: 'high', expectedLabel: 'High', expectedColor: 'warning', expectedState: 'warning' },
      {
        impact: 'medium',
        expectedLabel: 'Medium',
        expectedColor: 'primary',
        expectedState: 'warning',
      },
      { impact: 'low', expectedLabel: 'Low', expectedColor: 'subdued', expectedState: 'healthy' },
    ])(
      'maps $impact impact correctly',
      async ({ impact, expectedLabel, expectedColor, expectedState }) => {
        const mockDoc = createMockDocument({ impact });
        mockSearch.mockReturnValue(of(createMockSearchResponse(mockDoc)));

        const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.data?.severityLabel).toBe(expectedLabel);
        expect(result.current.data?.severityColor).toBe(expectedColor);
        expect(result.current.data?.state).toBe(expectedState);
      }
    );

    it('maps unknown impact to Unknown/subdued/healthy', async () => {
      const mockDoc = createMockDocument({ impact: 'unknown-value' });
      mockSearch.mockReturnValue(of(createMockSearchResponse(mockDoc)));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data?.severityLabel).toBe('Unknown');
      expect(result.current.data?.severityColor).toBe('subdued');
      expect(result.current.data?.state).toBe('healthy');
    });
  });

  describe('impacted services transformation', () => {
    it('filters to only confirmed blast_radius items', async () => {
      const mockDoc = createMockDocument();
      mockSearch.mockReturnValue(of(createMockSearchResponse(mockDoc)));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data?.impactedServices).toHaveLength(2);
      expect(result.current.data?.impactedServices[0]).toEqual({
        id: 'service-1',
        label: 'payment-service',
        iconType: 'package',
      });
    });

    it('handles missing blast_radius gracefully', async () => {
      const mockDoc = createMockDocument({ blast_radius: undefined });
      mockSearch.mockReturnValue(of(createMockSearchResponse(mockDoc)));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data?.impactedServices).toEqual([]);
    });
  });

  describe('impacted cards transformation', () => {
    it('includes confirmed cause_kis as root cause cards', async () => {
      const mockDoc = createMockDocument();
      mockSearch.mockReturnValue(of(createMockSearchResponse(mockDoc)));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      const rootCauseCard = result.current.data?.impactedCards.find(
        (card) => card.id === 'cause-cause-1'
      );
      expect(rootCauseCard).toEqual({
        id: 'cause-cause-1',
        label: 'Root Cause',
        value: 'db-connection-pool',
        iconType: 'warning',
      });
    });

    it('includes up to 2 service cards from confirmed services', async () => {
      const mockDoc = createMockDocument();
      mockSearch.mockReturnValue(of(createMockSearchResponse(mockDoc)));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      const serviceCards = result.current.data?.impactedCards.filter(
        (card) => card.label === 'Service'
      );
      expect(serviceCards).toHaveLength(2);
      expect(serviceCards?.[0]).toEqual({
        id: 'service-service-1',
        label: 'Service',
        value: 'payment-service',
        iconType: 'package',
      });
    });

    it('handles missing cause_kis gracefully', async () => {
      const mockDoc = createMockDocument({ cause_kis: undefined, blast_radius: [] });
      mockSearch.mockReturnValue(of(createMockSearchResponse(mockDoc)));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data?.impactedCards).toEqual([]);
    });
  });

  describe('timestamp', () => {
    it('includes the @timestamp field in the response', async () => {
      const mockDoc = createMockDocument();
      mockSearch.mockReturnValue(of(createMockSearchResponse(mockDoc)));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data?.timestamp).toBe('2024-01-15T10:00:00.000Z');
    });
  });

  describe('detail fields transformation', () => {
    it('constructs detail fields correctly', async () => {
      const mockDoc = createMockDocument();
      mockSearch.mockReturnValue(of(createMockSearchResponse(mockDoc)));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data?.detailFields).toEqual({
        id: 'event-123',
        label: 'Test Significant Event',
        subtitle: 'logs · checkout',
        severityLabel: 'Critical',
        severityColor: 'danger',
      });
    });

    it('handles missing stream_names gracefully', async () => {
      const mockDoc = createMockDocument({ stream_names: undefined });
      mockSearch.mockReturnValue(of(createMockSearchResponse(mockDoc)));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data?.detailFields.subtitle).toBe('');
    });
  });

  describe('description fallback', () => {
    it('uses summary as description when available', async () => {
      const mockDoc = createMockDocument({ summary: 'Primary summary' });
      mockSearch.mockReturnValue(of(createMockSearchResponse(mockDoc)));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data?.description).toBe('Primary summary');
    });

    it('falls back to first recommendation when summary is empty', async () => {
      const mockDoc = createMockDocument({
        summary: '',
        recommendations: ['First recommendation', 'Second recommendation'],
      });
      mockSearch.mockReturnValue(of(createMockSearchResponse(mockDoc)));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data?.description).toBe('First recommendation');
    });

    it('returns empty string when both summary and recommendations are missing', async () => {
      const mockDoc = createMockDocument({ summary: '', recommendations: undefined });
      mockSearch.mockReturnValue(of(createMockSearchResponse(mockDoc)));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data?.description).toBe('');
    });
  });

  describe('null field handling', () => {
    it('handles missing criticality with default 0', async () => {
      const mockDoc = createMockDocument({ criticality: undefined });
      mockSearch.mockReturnValue(of(createMockSearchResponse(mockDoc)));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data?.blastRadiusScore).toBe(0);
    });

    it('handles missing title with empty string', async () => {
      const mockDoc = createMockDocument({ title: undefined });
      mockSearch.mockReturnValue(of(createMockSearchResponse(mockDoc)));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data?.mainEventTitle).toBe('');
    });
  });

  describe('error handling', () => {
    it('returns error when search fails', async () => {
      const testError = new Error('Search failed');
      mockSearch.mockReturnValue({
        subscribe: ({ error }: { error: (err: Error) => void }) => {
          error(testError);
          return { unsubscribe: jest.fn() };
        },
      });

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeNull();
    });
  });

  describe('refetch', () => {
    it('provides a refetch function', async () => {
      mockSearch.mockReturnValue(of(createMockSearchResponse(createMockDocument())));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('raw document', () => {
    it('includes the raw document in the response', async () => {
      const mockDoc = createMockDocument();
      mockSearch.mockReturnValue(of(createMockSearchResponse(mockDoc)));

      const { result } = renderHook(() => useFetchLatestSignificantEvent(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.data?.raw).toEqual(mockDoc);
    });
  });
});
