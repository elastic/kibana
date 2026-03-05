/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useCallback, useMemo, useRef, useState } from 'react';
import type { InitializationFlowId } from '../../../../common/api/initialization';
import { useHttp } from '../../lib/kibana';
import { initializeSecuritySolution } from './api';
import type { InitializationState } from './types';

const DEFAULT_MAX_RETRIES = 2;

interface InitializationContextValue {
  state: InitializationState;
  requestInitialization: (flows: InitializationFlowId[]) => void;
}

export const InitializationContext = createContext<InitializationContextValue>({
  state: {},
  requestInitialization: () => {},
});

export interface InitializationProviderProps {
  maxRetries?: number;
}

export const InitializationProvider: FC<PropsWithChildren<InitializationProviderProps>> = ({
  children,
  maxRetries = DEFAULT_MAX_RETRIES,
}) => {
  const http = useHttp();
  const [state, setState] = useState<InitializationState>({});

  const inflightRef = useRef(new Set<InitializationFlowId>());
  const retryCountRef = useRef(new Map<InitializationFlowId, number>());
  const stateRef = useRef(state);
  stateRef.current = state;

  const requestInitialization = useCallback(
    async (flows: InitializationFlowId[]) => {
      const newFlows = flows.filter((id) => {
        if (inflightRef.current.has(id)) return false;
        if (stateRef.current[id]?.result) return false;
        return true;
      });

      if (newFlows.length === 0) {
        return;
      }

      for (const id of newFlows) {
        inflightRef.current.add(id);
      }

      setState((prev) => {
        const next = { ...prev };
        for (const id of newFlows) {
          next[id] = { loading: true, result: null, error: null };
        }
        return next;
      });

      try {
        const response = await initializeSecuritySolution({ http, flows: newFlows });

        setState((prev) => {
          const next = { ...prev };
          for (const id of newFlows) {
            const flowResult = response.flows[id];
            if (flowResult) {
              next[id] = { loading: false, result: flowResult, error: null };
            } else {
              next[id] = {
                loading: false,
                result: null,
                error: 'No result returned from server',
              };
            }
          }
          return next;
        });
      } catch (err) {
        const errorMessage = err.body?.message ?? err.message ?? 'Unknown error';

        setState((prev) => {
          const next = { ...prev };
          for (const id of newFlows) {
            next[id] = { loading: false, result: null, error: errorMessage };
          }
          return next;
        });

        const retryableFlows = newFlows.filter((id) => {
          const count = retryCountRef.current.get(id) ?? 0;
          return count < maxRetries;
        });

        if (retryableFlows.length > 0) {
          for (const id of retryableFlows) {
            retryCountRef.current.set(id, (retryCountRef.current.get(id) ?? 0) + 1);
          }
          for (const id of newFlows) {
            inflightRef.current.delete(id);
          }
          requestInitialization(retryableFlows);
          return;
        }
      } finally {
        for (const id of newFlows) {
          inflightRef.current.delete(id);
        }
      }
    },
    [http, maxRetries]
  );

  const contextValue = useMemo(
    () => ({
      state,
      requestInitialization,
    }),
    [state, requestInitialization]
  );

  return (
    <InitializationContext.Provider value={contextValue}>
      {children}
    </InitializationContext.Provider>
  );
};
