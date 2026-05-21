/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useContext } from 'react';
import { renderHook, waitFor } from '@testing-library/react';

import { InitializationContext, InitializationProvider } from './initialization_context';
import { useSecuritySolutionInitialization } from './use_security_solution_initialization';
import { initializeSecuritySolution } from './api';
import { useHttp } from '../../lib/kibana';
import type { InitializationFlowId } from '../../../../common/api/initialization';
import {
  INITIALIZATION_FLOW_CREATE_LIST_INDICES,
  INITIALIZATION_FLOW_SECURITY_DATA_VIEWS,
  INITIALIZATION_FLOW_STATUS_READY,
  INITIALIZATION_FLOW_STATUS_ERROR,
} from '../../../../common/api/initialization';

jest.mock('./api');
jest.mock('../../lib/kibana');

const mockHttp = {};
const mockInitializeSecuritySolution = initializeSecuritySolution as jest.Mock;

const flowA = INITIALIZATION_FLOW_CREATE_LIST_INDICES;
const flowB = INITIALIZATION_FLOW_SECURITY_DATA_VIEWS;

/** A minimal valid payload matching the SecurityDataViewsReadyResult schema. */
const mockSecurityDataviewsPayload = {
  defaultDataView: { id: 'dv-1', title: 'default-*', patternList: ['default-*'] },
  alertDataView: { id: 'dv-2', title: '.alerts-*', patternList: ['.alerts-*'] },
  kibanaDataViews: [],
  signalIndexName: '.siem-signals-default',
};

const wrapper: FC<PropsWithChildren> = ({ children }) => (
  <InitializationProvider>{children}</InitializationProvider>
);

/**
 * Renders useSecuritySolutionInitialization within the provider.
 * The hook triggers requestInitialization automatically via its internal effect.
 * Also exposes the raw context for deduplication tests that need to call
 * requestInitialization manually.
 */
const renderInit = (flows: InitializationFlowId[]) =>
  renderHook(
    () => ({
      state: useSecuritySolutionInitialization(flows),
      ctx: useContext(InitializationContext),
    }),
    { wrapper }
  );

beforeEach(() => {
  jest.clearAllMocks();
  (useHttp as jest.Mock).mockReturnValue(mockHttp);
});

describe('InitializationProvider - happy path', () => {
  it('sets loading=false, result={status:ready, payload} when a single flow succeeds', async () => {
    mockInitializeSecuritySolution.mockResolvedValueOnce({
      flows: {
        [flowB]: {
          status: INITIALIZATION_FLOW_STATUS_READY,
          payload: mockSecurityDataviewsPayload,
        },
      },
    });

    const { result } = renderInit([flowB]);

    await waitFor(() => {
      expect(result.current.state[flowB]?.loading).toBe(false);
    });

    expect(result.current.state[flowB]).toEqual({
      loading: false,
      result: { status: INITIALIZATION_FLOW_STATUS_READY, payload: mockSecurityDataviewsPayload },
    });
    expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(1);
  });

  it('sets result={status:ready, payload:null} when a flow has no payload', async () => {
    mockInitializeSecuritySolution.mockResolvedValueOnce({
      flows: { [flowA]: { status: INITIALIZATION_FLOW_STATUS_READY } },
    });

    const { result } = renderInit([flowA]);

    await waitFor(() => {
      expect(result.current.state[flowA]?.loading).toBe(false);
    });

    expect(result.current.state[flowA]).toEqual({
      loading: false,
      result: { status: INITIALIZATION_FLOW_STATUS_READY, payload: null },
    });
    expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(1);
  });

  it('resolves all flows in a batch in a single request', async () => {
    mockInitializeSecuritySolution.mockResolvedValueOnce({
      flows: {
        [flowA]: { status: INITIALIZATION_FLOW_STATUS_READY },
        [flowB]: {
          status: INITIALIZATION_FLOW_STATUS_READY,
          payload: mockSecurityDataviewsPayload,
        },
      },
    });

    const { result } = renderInit([flowA, flowB]);

    await waitFor(() => {
      expect(result.current.state[flowA]?.loading).toBe(false);
      expect(result.current.state[flowB]?.loading).toBe(false);
    });

    expect(result.current.state[flowA]).toEqual({
      loading: false,
      result: { status: INITIALIZATION_FLOW_STATUS_READY, payload: null },
    });
    expect(result.current.state[flowB]).toEqual({
      loading: false,
      result: { status: INITIALIZATION_FLOW_STATUS_READY, payload: mockSecurityDataviewsPayload },
    });
    expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(1);
    expect(mockInitializeSecuritySolution).toHaveBeenCalledWith({
      http: mockHttp,
      flows: [flowA, flowB],
    });
  });

  it('returns loading=true immediately before the request settles', () => {
    mockInitializeSecuritySolution.mockImplementation(() => new Promise(() => {}));

    const { result } = renderInit([flowA]);

    // loading is derived from absence in settledState, so it is true from the very first render
    expect(result.current.state[flowA]).toEqual({
      loading: true,
      result: null,
    });
  });
});

describe('InitializationProvider - error flow', () => {
  describe('error message extraction', () => {
    it('uses err.body.message when available', async () => {
      mockInitializeSecuritySolution.mockRejectedValue({ body: { message: 'Server error' } });

      const { result } = renderInit([flowA]);

      // error is only surfaced once all retries are exhausted
      await waitFor(() => {
        expect(result.current.state[flowA]?.result).toMatchObject({
          status: INITIALIZATION_FLOW_STATUS_ERROR,
          error: 'Server error',
        });
      });
    });

    it('falls back to err.message when body.message is absent', async () => {
      mockInitializeSecuritySolution.mockRejectedValue(new Error('Network error'));

      const { result } = renderInit([flowA]);

      await waitFor(() => {
        expect(result.current.state[flowA]?.result).toMatchObject({
          status: INITIALIZATION_FLOW_STATUS_ERROR,
          error: 'Network error',
        });
      });
    });

    it('falls back to "Unknown error" when neither body.message nor message is present', async () => {
      mockInitializeSecuritySolution.mockRejectedValue({});

      const { result } = renderInit([flowA]);

      await waitFor(() => {
        expect(result.current.state[flowA]?.result).toMatchObject({
          status: INITIALIZATION_FLOW_STATUS_ERROR,
          error: 'Unknown error',
        });
      });
    });
  });

  describe('state shape on error', () => {
    it('sets loading=false and result={status:error} after all retries are exhausted', async () => {
      mockInitializeSecuritySolution.mockRejectedValue(new Error('fail'));

      const { result } = renderInit([flowA]);

      await waitFor(() => {
        expect(result.current.state[flowA]?.loading).toBe(false);
      });

      expect(result.current.state[flowA]).toEqual({
        loading: false,
        result: { status: INITIALIZATION_FLOW_STATUS_ERROR, error: 'fail' },
      });
    });

    it('sets result={status:error} on every flow in the batch when all retries are exhausted', async () => {
      mockInitializeSecuritySolution.mockRejectedValue(new Error('batch fail'));

      const { result } = renderInit([flowA, flowB]);

      await waitFor(() => {
        expect(result.current.state[flowA]).toMatchObject({
          loading: false,
          result: { status: INITIALIZATION_FLOW_STATUS_ERROR, error: 'batch fail' },
        });
        expect(result.current.state[flowB]).toMatchObject({
          loading: false,
          result: { status: INITIALIZATION_FLOW_STATUS_ERROR, error: 'batch fail' },
        });
      });
    });

    it('keeps loading=true while retries are pending, only sets loading=false when budget is exhausted', async () => {
      mockInitializeSecuritySolution.mockRejectedValue(new Error('fail'));

      const { result } = renderInit([flowA]);

      // loading is true from the start; it stays true through retries and only
      // flips to false once the flow enters settledState after budget exhaustion.
      await waitFor(() => {
        expect(result.current.state[flowA]?.loading).toBe(false);
      });

      expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(3);
      expect(result.current.state[flowA]).toMatchObject({
        loading: false,
        result: { status: INITIALIZATION_FLOW_STATUS_ERROR, error: 'fail' },
      });
    });
  });

  describe('retry logic', () => {
    it('retries a failing flow up to DEFAULT_MAX_RETRIES (2) times, making 3 total API calls', async () => {
      mockInitializeSecuritySolution.mockRejectedValue(new Error('fail'));

      renderInit([flowA]);

      await waitFor(() => {
        expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(3);
      });
    });

    it('stops retrying after retry budget is exhausted', async () => {
      mockInitializeSecuritySolution.mockRejectedValue(new Error('fail'));

      renderInit([flowA]);

      await waitFor(() => {
        expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(3);
      });

      // Give the event loop a few ticks to confirm no further calls are queued
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(3);
    });

    it('leaves the flow in an error state after all retries are exhausted', async () => {
      mockInitializeSecuritySolution.mockRejectedValue(new Error('terminal'));

      const { result } = renderInit([flowA]);

      await waitFor(() => {
        expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(3);
      });

      expect(result.current.state[flowA]).toMatchObject({
        loading: false,
        result: { status: INITIALIZATION_FLOW_STATUS_ERROR, error: 'terminal' },
      });
    });

    it('retries each flow in a batch independently, with one recovering on the final retry', async () => {
      mockInitializeSecuritySolution
        // Call 1: network-level failure – both flows caught, retryCount 0 → 1.
        .mockRejectedValueOnce(new Error('network error'))
        // Call 2: server returns status:error for both – retryCount 1 → 2.
        .mockResolvedValueOnce({
          flows: {
            [flowA]: { status: INITIALIZATION_FLOW_STATUS_ERROR, error: 'server error attempt 2' },
            [flowB]: { status: INITIALIZATION_FLOW_STATUS_ERROR, error: 'server error attempt 2' },
          },
        })
        // Call 3: final retry – flowA recovers; budget exhausted, no further retries.
        .mockResolvedValueOnce({
          flows: {
            [flowA]: { status: INITIALIZATION_FLOW_STATUS_READY },
            [flowB]: { status: INITIALIZATION_FLOW_STATUS_ERROR, error: 'permanent failure' },
          },
        });

      const { result } = renderInit([flowA, flowB]);

      await waitFor(() => {
        expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(3);
      });

      // Both flows must appear in every batch
      for (const call of mockInitializeSecuritySolution.mock.calls) {
        expect(call[0].flows).toContain(flowA);
        expect(call[0].flows).toContain(flowB);
      }

      // flowA recovered on the final retry
      expect(result.current.state[flowA]).toMatchObject({
        loading: false,
        result: { status: INITIALIZATION_FLOW_STATUS_READY, payload: null },
      });

      // flowB never recovered
      expect(result.current.state[flowB]).toMatchObject({
        loading: false,
        result: { status: INITIALIZATION_FLOW_STATUS_ERROR, error: 'permanent failure' },
      });
    });
  });

  describe('in-flight deduplication', () => {
    it('does not send a second request for a flow that is already in-flight', async () => {
      mockInitializeSecuritySolution.mockImplementation(
        () => new Promise(() => {}) // never resolves so the flow stays in-flight
      );

      const { result } = renderInit([flowA]);

      // Wait for the hook's effect to fire and the flow to be in-flight
      await waitFor(() => {
        expect(result.current.state[flowA]?.loading).toBe(true);
      });

      // Manually trigger a second request for the same flow
      result.current.ctx.requestInitialization([flowA]);

      expect(mockInitializeSecuritySolution).toHaveBeenCalledTimes(1);
    });

    it('does not re-request a flow that already completed successfully', async () => {
      mockInitializeSecuritySolution.mockResolvedValueOnce({
        flows: { [flowA]: { status: INITIALIZATION_FLOW_STATUS_READY } },
      });

      const { result } = renderInit([flowA]);

      await waitFor(() => {
        expect(result.current.state[flowA]?.loading).toBe(false);
      });

      mockInitializeSecuritySolution.mockClear();

      result.current.ctx.requestInitialization([flowA]);

      expect(mockInitializeSecuritySolution).not.toHaveBeenCalled();
    });

    it('does not re-request a flow that already settled with an error', async () => {
      mockInitializeSecuritySolution.mockRejectedValue(new Error('fail'));

      const { result } = renderInit([flowA]);

      await waitFor(() => {
        expect(result.current.state[flowA]?.loading).toBe(false);
      });

      mockInitializeSecuritySolution.mockClear();

      result.current.ctx.requestInitialization([flowA]);

      expect(mockInitializeSecuritySolution).not.toHaveBeenCalled();
    });
  });
});

describe('InitializationProvider - per-flow schema validation', () => {
  it('settles a flow as error when its schema validation fails', async () => {
    // flowA (create-list-indices) schema expects { status: 'ready' } or { status: 'error' }.
    // Sending an invalid status triggers a validation failure on every attempt.
    mockInitializeSecuritySolution.mockResolvedValue({
      flows: {
        [flowA]: { status: 'invalid-status', payload: { bad: true } },
      },
    });

    const { result } = renderInit([flowA]);

    await waitFor(() => {
      expect(result.current.state[flowA]?.loading).toBe(false);
    });

    expect(result.current.state[flowA]?.result).toMatchObject({
      status: INITIALIZATION_FLOW_STATUS_ERROR,
      error: expect.stringContaining(`Invalid response for flow '${flowA}'`),
    });
  });

  it('only errors the flow with the invalid result, not the entire batch', async () => {
    mockInitializeSecuritySolution.mockResolvedValueOnce({
      flows: {
        // flowA: invalid status triggers validation failure
        [flowA]: { status: 'invalid-status' },
        // flowB: valid result
        [flowB]: {
          status: INITIALIZATION_FLOW_STATUS_READY,
          payload: mockSecurityDataviewsPayload,
        },
      },
    });

    const { result } = renderInit([flowA, flowB]);

    await waitFor(() => {
      expect(result.current.state[flowA]?.loading).toBe(false);
      expect(result.current.state[flowB]?.loading).toBe(false);
    });

    expect(result.current.state[flowA]?.result).toMatchObject({
      status: INITIALIZATION_FLOW_STATUS_ERROR,
    });
    expect(result.current.state[flowB]?.result).toMatchObject({
      status: INITIALIZATION_FLOW_STATUS_READY,
      payload: mockSecurityDataviewsPayload,
    });
  });

  it('handles a validated error result correctly', async () => {
    // Schema validates successfully, but the result has status: 'error'.
    // The flow will be retried, so mock all 3 calls to return the same error.
    mockInitializeSecuritySolution.mockResolvedValue({
      flows: {
        [flowA]: { status: INITIALIZATION_FLOW_STATUS_ERROR, error: 'flow-level error' },
      },
    });

    const { result } = renderInit([flowA]);

    await waitFor(() => {
      expect(result.current.state[flowA]?.loading).toBe(false);
    });

    expect(result.current.state[flowA]?.result).toEqual({
      status: INITIALIZATION_FLOW_STATUS_ERROR,
      error: 'flow-level error',
    });
  });
});
