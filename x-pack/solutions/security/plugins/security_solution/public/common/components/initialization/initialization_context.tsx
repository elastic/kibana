/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useCallback, useMemo, useRef, useState } from 'react';
import {
  INITIALIZATION_FLOW_STATUS_READY,
  INITIALIZATION_FLOW_STATUS_ERROR,
  parseFlowPayload,
} from '../../../../common/api/initialization';
import type { InitializationFlowId } from '../../../../common/api/initialization';
import { useHttp } from '../../lib/kibana';
import { initializeSecuritySolution } from './api';
import type { InitializationFlowResult, SettledInitializationState } from './types';

const DEFAULT_MAX_RETRIES = 2;

export interface InitializationContextValue {
  /**
   * Flows that have reached a terminal state (success or budget-exhausted error).
   * A flow is absent from this map while it is loading or not yet requested.
   */
  settledState: SettledInitializationState;
  requestInitialization: (flows: InitializationFlowId[]) => void;
}

export const InitializationContext = createContext<InitializationContextValue>({
  settledState: {},
  requestInitialization: () => {},
});

export const InitializationProvider: FC<PropsWithChildren> = ({ children }) => {
  const http = useHttp();
  const [settledState, setSettledState] = useState<SettledInitializationState>({});

  const inflightRef = useRef(new Set<InitializationFlowId>());
  const retryCountRef = useRef(new Map<InitializationFlowId, number>());
  const settledStateRef = useRef(settledState);
  settledStateRef.current = settledState;

  const requestInitialization = useCallback(
    async (flows: InitializationFlowId[]) => {
      const newFlows = flows.filter((id) => {
        if (inflightRef.current.has(id)) return false;
        // Skip flows that have already settled (success or terminal error).
        if (settledStateRef.current[id]) return false;
        return true;
      });

      if (newFlows.length === 0) {
        return;
      }

      for (const id of newFlows) {
        inflightRef.current.add(id);
      }

      let retryableFlows: InitializationFlowId[] = [];

      try {
        const response = await initializeSecuritySolution({ http, flows: newFlows });

        retryableFlows = newFlows.filter((id) => {
          if (response.flows[id]?.status === INITIALIZATION_FLOW_STATUS_READY) return false;
          const count = retryCountRef.current.get(id) ?? 0;
          return count < DEFAULT_MAX_RETRIES;
        });

        const toSettle: Array<[InitializationFlowId, InitializationFlowResult<unknown>]> = newFlows
          .filter((id) => !retryableFlows.includes(id))
          .map((id) => {
            const flowResult = response.flows[id];
            if (flowResult?.status === INITIALIZATION_FLOW_STATUS_READY) {
              try {
                const payload = parseFlowPayload(id, flowResult.payload);
                return [id, { status: INITIALIZATION_FLOW_STATUS_READY, payload }];
              } catch (parseErr) {
                return [
                  id,
                  {
                    status: INITIALIZATION_FLOW_STATUS_ERROR,
                    error: `Invalid payload for flow '${id}': ${parseErr.message}`,
                  },
                ];
              }
            }
            return [
              id,
              {
                status: INITIALIZATION_FLOW_STATUS_ERROR,
                error: flowResult?.error ?? 'No result returned from server',
              },
            ];
          });

        if (toSettle.length > 0) {
          setSettledState((prev) => {
            const next = { ...prev };
            for (const [id, result] of toSettle) {
              next[id] = result;
            }
            return next;
          });
        }
      } catch (err) {
        const errorMessage = err.body?.message ?? err.message ?? 'Unknown error';

        retryableFlows = newFlows.filter((id) => {
          const count = retryCountRef.current.get(id) ?? 0;
          return count < DEFAULT_MAX_RETRIES;
        });

        const toSettle = newFlows.filter((id) => !retryableFlows.includes(id));

        if (toSettle.length > 0) {
          setSettledState((prev) => {
            const next = { ...prev };
            for (const id of toSettle) {
              next[id] = { status: INITIALIZATION_FLOW_STATUS_ERROR, error: errorMessage };
            }
            return next;
          });
        }
      }

      for (const id of retryableFlows) {
        retryCountRef.current.set(id, (retryCountRef.current.get(id) ?? 0) + 1);
      }

      for (const id of newFlows) {
        inflightRef.current.delete(id);
      }

      if (retryableFlows.length > 0) {
        requestInitialization(retryableFlows);
      }
    },
    [http]
  );

  const contextValue = useMemo(
    () => ({ settledState, requestInitialization }),
    [settledState, requestInitialization]
  );

  return (
    <InitializationContext.Provider value={contextValue}>{children}</InitializationContext.Provider>
  );
};
