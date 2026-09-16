/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useKibana } from '../../hooks/use_kibana';
import { callObservabilityOnboardingApi } from '../../services/rest/create_call_api';
import { ApiEndpointId } from '../../../common/api_endpoints';
import { IS_INGEST_RECEIPTS_ENABLED } from '../../../common/feature_flags';
import { useIngestReceiptToast } from './use_ingest_receipt_toast';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../services/rest/create_call_api', () => ({
  callObservabilityOnboardingApi: jest.fn(),
}));

const mockUseKibana = useKibana as jest.Mock;
const mockCallApi = callObservabilityOnboardingApi as jest.Mock;

const addSuccess = jest.fn();

const POLL_INTERVAL_MS = 5_000;
const POLL_DURATION_MS = 30 * 60 * 1_000;

const advanceBy = async (milliseconds: number) => {
  await act(async () => {
    jest.advanceTimersByTime(milliseconds);
  });
};

const mockServices = (ingestReceiptsEnabled: boolean) => {
  mockUseKibana.mockReturnValue({
    services: {
      notifications: { toasts: { addSuccess } },
      featureFlags: {
        getBooleanValue: jest
          .fn()
          .mockImplementation((key: string) =>
            key === IS_INGEST_RECEIPTS_ENABLED ? ingestReceiptsEnabled : false
          ),
      },
    },
  });
};

describe('useIngestReceiptToast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockServices(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not poll when the ingest receipts flag is off', async () => {
    mockServices(false);
    mockCallApi.mockResolvedValue({ received: true });

    renderHook(() => useIngestReceiptToast({ [ApiEndpointId.OpenTelemetry]: 'key-id' }));
    await advanceBy(POLL_INTERVAL_MS * 3);

    expect(mockCallApi).not.toHaveBeenCalled();
    expect(addSuccess).not.toHaveBeenCalled();
  });

  it('polls the verification route with the created key and endpoint', async () => {
    mockCallApi.mockResolvedValue({ received: false });

    renderHook(() => useIngestReceiptToast({ [ApiEndpointId.OpenTelemetry]: 'key-id' }));
    await advanceBy(POLL_INTERVAL_MS);

    expect(mockCallApi).toHaveBeenCalledWith(
      'GET /internal/observability_onboarding/api_endpoints/verification',
      {
        signal: expect.any(AbortSignal),
        params: { query: { apiKeyId: 'key-id', endpointId: ApiEndpointId.OpenTelemetry } },
      }
    );
  });

  it('aborts the in flight request when the page goes away', async () => {
    mockCallApi.mockResolvedValue({ received: false });

    const { unmount } = renderHook(() =>
      useIngestReceiptToast({ [ApiEndpointId.OpenTelemetry]: 'key-id' })
    );
    await advanceBy(POLL_INTERVAL_MS);

    const { signal } = mockCallApi.mock.calls[0][1];
    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });

  it('does not poll before a key has been created', async () => {
    renderHook(() => useIngestReceiptToast({}));
    await advanceBy(POLL_INTERVAL_MS * 3);

    expect(mockCallApi).not.toHaveBeenCalled();
  });

  it('does not poll for vendor endpoints', async () => {
    renderHook(() =>
      useIngestReceiptToast({
        [ApiEndpointId.Supabase]: 'supabase-key-id',
        [ApiEndpointId.Vercel]: 'vercel-key-id',
      })
    );
    await advanceBy(POLL_INTERVAL_MS * 3);

    expect(mockCallApi).not.toHaveBeenCalled();
  });

  it('keeps polling while no receipt has arrived', async () => {
    mockCallApi.mockResolvedValue({ received: false });

    renderHook(() => useIngestReceiptToast({ [ApiEndpointId.Prometheus]: 'key-id' }));
    await advanceBy(POLL_INTERVAL_MS);
    await advanceBy(POLL_INTERVAL_MS);
    await advanceBy(POLL_INTERVAL_MS);

    expect(mockCallApi).toHaveBeenCalledTimes(3);
    expect(addSuccess).not.toHaveBeenCalled();
  });

  it('shows a single success toast and stops polling once a receipt arrives', async () => {
    mockCallApi.mockResolvedValue({ received: true });

    renderHook(() => useIngestReceiptToast({ [ApiEndpointId.OpenTelemetry]: 'key-id' }));
    await advanceBy(POLL_INTERVAL_MS);

    expect(addSuccess).toHaveBeenCalledTimes(1);
    expect(addSuccess).toHaveBeenCalledWith({
      title: 'We are receiving your data',
      text: 'The OpenTelemetry endpoint accepted a request with the API key you created.',
    });

    await advanceBy(POLL_INTERVAL_MS * 3);

    expect(mockCallApi).toHaveBeenCalledTimes(1);
    expect(addSuccess).toHaveBeenCalledTimes(1);
  });

  it('polls again when a new key replaces one that already got a toast', async () => {
    mockCallApi.mockResolvedValue({ received: true });

    const { rerender } = renderHook(
      ({ apiKeyIds }: { apiKeyIds: Partial<Record<ApiEndpointId, string>> }) =>
        useIngestReceiptToast(apiKeyIds),
      { initialProps: { apiKeyIds: { [ApiEndpointId.OpenTelemetry]: 'first-key-id' } } }
    );
    await advanceBy(POLL_INTERVAL_MS);

    expect(mockCallApi).toHaveBeenCalledTimes(1);
    expect(addSuccess).toHaveBeenCalledTimes(1);

    rerender({ apiKeyIds: { [ApiEndpointId.OpenTelemetry]: 'second-key-id' } });
    await advanceBy(POLL_INTERVAL_MS);

    expect(mockCallApi).toHaveBeenCalledTimes(2);
    expect(mockCallApi).toHaveBeenLastCalledWith(
      'GET /internal/observability_onboarding/api_endpoints/verification',
      expect.objectContaining({
        params: { query: { apiKeyId: 'second-key-id', endpointId: ApiEndpointId.OpenTelemetry } },
      })
    );
    expect(addSuccess).toHaveBeenCalledTimes(2);
  });

  it('aborts and ignores a pending answer for a key that has been replaced', async () => {
    let resolveFirst: (value: { received: boolean }) => void = () => {};
    mockCallApi
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValue({ received: false });

    const { rerender } = renderHook(
      ({ apiKeyIds }: { apiKeyIds: Partial<Record<ApiEndpointId, string>> }) =>
        useIngestReceiptToast(apiKeyIds),
      { initialProps: { apiKeyIds: { [ApiEndpointId.OpenTelemetry]: 'first-key-id' } } }
    );
    await advanceBy(POLL_INTERVAL_MS);

    const { signal } = mockCallApi.mock.calls[0][1];
    expect(signal.aborted).toBe(false);

    rerender({ apiKeyIds: { [ApiEndpointId.OpenTelemetry]: 'second-key-id' } });
    expect(signal.aborted).toBe(true);

    await act(async () => {
      resolveFirst({ received: true });
    });
    expect(addSuccess).not.toHaveBeenCalled();

    await advanceBy(POLL_INTERVAL_MS);
    expect(mockCallApi).toHaveBeenLastCalledWith(
      'GET /internal/observability_onboarding/api_endpoints/verification',
      expect.objectContaining({
        params: { query: { apiKeyId: 'second-key-id', endpointId: ApiEndpointId.OpenTelemetry } },
      })
    );
    expect(addSuccess).not.toHaveBeenCalled();
  });

  it('gives a replacement key its own thirty minute window', async () => {
    mockCallApi.mockResolvedValue({ received: false });

    const { rerender } = renderHook(
      ({ apiKeyIds }: { apiKeyIds: Partial<Record<ApiEndpointId, string>> }) =>
        useIngestReceiptToast(apiKeyIds),
      { initialProps: { apiKeyIds: { [ApiEndpointId.OpenTelemetry]: 'first-key-id' } } }
    );
    await advanceBy(POLL_INTERVAL_MS);
    await advanceBy(POLL_DURATION_MS + POLL_INTERVAL_MS);

    const callsWhenGivingUp = mockCallApi.mock.calls.length;
    await advanceBy(POLL_INTERVAL_MS * 3);
    expect(mockCallApi).toHaveBeenCalledTimes(callsWhenGivingUp);

    rerender({ apiKeyIds: { [ApiEndpointId.OpenTelemetry]: 'second-key-id' } });
    await advanceBy(POLL_INTERVAL_MS);

    expect(mockCallApi).toHaveBeenCalledTimes(callsWhenGivingUp + 1);
  });

  it('polls each endpoint that has a key independently', async () => {
    mockCallApi.mockImplementation((_endpoint, options) =>
      Promise.resolve({
        received: options.params.query.endpointId === ApiEndpointId.Elasticsearch,
      })
    );

    renderHook(() =>
      useIngestReceiptToast({
        [ApiEndpointId.Elasticsearch]: 'elasticsearch-key-id',
        [ApiEndpointId.Prometheus]: 'prometheus-key-id',
      })
    );
    await advanceBy(POLL_INTERVAL_MS);

    expect(mockCallApi).toHaveBeenCalledTimes(2);
    expect(addSuccess).toHaveBeenCalledTimes(1);
    expect(addSuccess).toHaveBeenCalledWith({
      title: 'We are receiving your data',
      text: 'The Elasticsearch endpoint accepted a request with the API key you created.',
    });

    await advanceBy(POLL_INTERVAL_MS);

    expect(mockCallApi).toHaveBeenCalledTimes(3);
  });

  it('stops polling when the key is not owned by the caller anymore', async () => {
    mockCallApi.mockRejectedValue({ response: { status: 404 } });

    renderHook(() => useIngestReceiptToast({ [ApiEndpointId.OpenTelemetry]: 'key-id' }));
    await advanceBy(POLL_INTERVAL_MS);
    await advanceBy(POLL_INTERVAL_MS * 3);

    expect(mockCallApi).toHaveBeenCalledTimes(1);
    expect(addSuccess).not.toHaveBeenCalled();
  });

  it('keeps polling after a transient failure', async () => {
    mockCallApi.mockRejectedValue({ response: { status: 503 } });

    renderHook(() => useIngestReceiptToast({ [ApiEndpointId.OpenTelemetry]: 'key-id' }));
    await advanceBy(POLL_INTERVAL_MS);
    await advanceBy(POLL_INTERVAL_MS);

    expect(mockCallApi).toHaveBeenCalledTimes(2);
    expect(addSuccess).not.toHaveBeenCalled();
  });

  it('gives up after thirty minutes without a receipt', async () => {
    mockCallApi.mockResolvedValue({ received: false });

    renderHook(() => useIngestReceiptToast({ [ApiEndpointId.OpenTelemetry]: 'key-id' }));
    await advanceBy(POLL_INTERVAL_MS);
    await advanceBy(POLL_DURATION_MS + POLL_INTERVAL_MS);

    const callsWhenGivingUp = mockCallApi.mock.calls.length;
    await advanceBy(POLL_INTERVAL_MS * 3);

    expect(mockCallApi).toHaveBeenCalledTimes(callsWhenGivingUp);
    expect(addSuccess).not.toHaveBeenCalled();
  });
});
