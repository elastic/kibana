/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  InitializationFlowId,
  InitializationFlowStatus,
} from '../../../../common/api/initialization';
import { useHttp } from '../../lib/kibana';
import { fetchInitializationStatus, initializeSecuritySolution } from './api';
import type { InitializationState } from './types';

const DEFAULT_POLL_INTERVAL_MS = 2000;

interface InitializationContextValue {
  state: InitializationState;
  requestInitialization: (flows: InitializationFlowId[]) => void;
}

export const InitializationContext = createContext<InitializationContextValue>({
  state: {},
  requestInitialization: () => {},
});

export interface InitializationProviderProps {
  pollIntervalMs?: number;
}

export const InitializationProvider: FC<PropsWithChildren<InitializationProviderProps>> = ({
  children,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}) => {
  const http = useHttp();
  const [state, setState] = useState<InitializationState>({});

  const requestedFlowsRef = useRef(new Set<InitializationFlowId>());
  const pollingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const pollStatus = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;

    const poll = async () => {
      while (mountedRef.current) {
        try {
          const statusResponse = await fetchInitializationStatus({ http });
          if (!mountedRef.current) break;

          const flowEntries = Object.entries(statusResponse.flows) as Array<
            [InitializationFlowId, { status: string; error?: string }]
          >;

          setState((prev) => {
            const next = { ...prev };
            for (const [flowId, flowState] of flowEntries) {
              if (requestedFlowsRef.current.has(flowId)) {
                const isInProgress =
                  flowState.status === 'pending' || flowState.status === 'running';
                next[flowId] = {
                  loading: isInProgress,
                  result: {
                    status: flowState.status as InitializationFlowStatus,
                    error: flowState.error,
                  },
                  error: null,
                };
              }
            }
            return next;
          });

          const hasInProgress = flowEntries.some(
            ([flowId, flowState]) =>
              requestedFlowsRef.current.has(flowId) &&
              (flowState.status === 'pending' || flowState.status === 'running')
          );

          if (!hasInProgress) break;
        } catch (err) {
          if (!mountedRef.current) break;
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }

      pollingRef.current = false;
    };

    await poll();
  }, [http, pollIntervalMs]);

  const requestInitialization = useCallback(
    async (flows: InitializationFlowId[]) => {
      const newFlows = flows.filter((id) => !requestedFlowsRef.current.has(id));

      if (newFlows.length === 0) return;

      for (const id of newFlows) {
        requestedFlowsRef.current.add(id);
      }

      setState((prev) => {
        const next = { ...prev };
        for (const id of newFlows) {
          next[id] = { loading: true, result: null, error: null };
        }
        return next;
      });

      try {
        await initializeSecuritySolution({ http, flows: newFlows });
      } catch (err) {
        const errorMessage = err.body?.message ?? err.message ?? 'Unknown error';
        setState((prev) => {
          const next = { ...prev };
          for (const id of newFlows) {
            next[id] = { loading: false, result: null, error: errorMessage };
          }
          return next;
        });
        return;
      }

      pollStatus();
    },
    [http, pollStatus]
  );

  const contextValue = useMemo(
    () => ({
      state,
      requestInitialization,
    }),
    [state, requestInitialization]
  );

  return (
    <InitializationContext.Provider value={contextValue}>{children}</InitializationContext.Provider>
  );
};
