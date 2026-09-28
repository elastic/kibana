/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { useKibana } from './use_kibana';
import { useTriggerInvestigation } from './use_trigger_investigation';

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('useTriggerInvestigation', () => {
  const fetch = jest.fn();
  const addSuccess = jest.fn();
  const addError = jest.fn();

  const mockEvent: SignificantEvent = {
    '@timestamp': '2026-09-28T12:00:00.000Z',
    event_uuid: 'uuid-123',
    event_id: 'event-456',
    title: 'High CPU on host-01',
    summary: 'CPU exceeded 95% threshold',
    status: 'open',
    severity: '80-critical',
    confidence: 0.95,
    stream_names: ['logs-stream', 'metrics-stream'],
    causal_features: [{ feature_id: 'cpu.usage', score: 0.9 }],
    blast_radius: ['host-01', 'service-api'],
  } as unknown as SignificantEvent;

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    fetch.mockReset();
    addSuccess.mockReset();
    addError.mockReset();
    fetch.mockResolvedValue({ investigation_id: 'inv-123' });
    mockUseKibana.mockReturnValue({
      core: { notifications: { toasts: { addSuccess, addError } } },
      dependencies: {
        start: {
          nightshiftInvestigations: {
            investigationsClient: { fetch },
          },
        },
      },
    } as never);
  });

  it('triggers investigation with mapped event payload', async () => {
    const onTriggerSuccess = jest.fn();
    const { result } = renderHook(() => useTriggerInvestigation({ onTriggerSuccess }), {
      wrapper,
    });

    act(() => {
      result.current.triggerInvestigation(mockEvent);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('POST /internal/nightshift/investigations', {
        params: {
          body: {
            subject: {
              type: 'significant_event',
              id: 'event-456',
              summary: 'CPU exceeded 95% threshold',
            },
            title: 'High CPU on host-01',
            message: 'High CPU on host-01\n\nCPU exceeded 95% threshold',
            stream_names: ['logs-stream', 'metrics-stream'],
            concurrency_key: 'event-456',
            context: {
              event_uuid: 'uuid-123',
              event_id: 'event-456',
              status: 'open',
              severity: '80-critical',
              confidence: 0.95,
              causal_features: [{ feature_id: 'cpu.usage', score: 0.9 }],
              blast_radius: ['host-01', 'service-api'],
            },
          },
        },
        signal: null,
      });
      expect(addSuccess).toHaveBeenCalled();
      expect(onTriggerSuccess).toHaveBeenCalled();
    });
  });

  it('defaults stream_names, causal_features, and blast_radius to empty arrays when omitted', async () => {
    const minimalEvent: SignificantEvent = {
      '@timestamp': '2026-09-28T12:00:00.000Z',
      event_uuid: 'uuid-minimal',
      event_id: 'event-minimal',
      title: 'Minimal Event',
      summary: 'Minimal Summary',
      status: 'open',
      severity: '20-low',
      confidence: 0.5,
    } as unknown as SignificantEvent;

    const { result } = renderHook(() => useTriggerInvestigation(), { wrapper });

    act(() => {
      result.current.triggerInvestigation(minimalEvent);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('POST /internal/nightshift/investigations', {
        params: {
          body: {
            subject: {
              type: 'significant_event',
              id: 'event-minimal',
              summary: 'Minimal Summary',
            },
            title: 'Minimal Event',
            message: 'Minimal Event\n\nMinimal Summary',
            stream_names: [],
            concurrency_key: 'event-minimal',
            context: {
              event_uuid: 'uuid-minimal',
              event_id: 'event-minimal',
              status: 'open',
              severity: '20-low',
              confidence: 0.5,
              causal_features: [],
              blast_radius: [],
            },
          },
        },
        signal: null,
      });
    });
  });

  it('shows error toast when fetch rejects', async () => {
    fetch.mockRejectedValue(new Error('Backend error'));
    const { result } = renderHook(() => useTriggerInvestigation(), { wrapper });

    act(() => {
      result.current.triggerInvestigation(mockEvent);
    });

    await waitFor(() => {
      expect(addError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Backend error' }),
        expect.objectContaining({ title: expect.any(String) })
      );
    });
  });

  it('shows error toast when nightshiftInvestigations client is unavailable', async () => {
    mockUseKibana.mockReturnValue({
      core: { notifications: { toasts: { addSuccess, addError } } },
      dependencies: {
        start: {},
      },
    } as never);

    const { result } = renderHook(() => useTriggerInvestigation(), { wrapper });

    act(() => {
      result.current.triggerInvestigation(mockEvent);
    });

    await waitFor(() => {
      expect(addError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Nightshift investigations plugin is unavailable' }),
        expect.objectContaining({ title: expect.any(String) })
      );
    });
  });
});
