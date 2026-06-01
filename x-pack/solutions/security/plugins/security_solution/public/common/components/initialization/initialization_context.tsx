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
  InitializationFlowsResult,
} from '../../../../common/api/initialization';
import type { InitializationFlowId } from '../../../../common/api/initialization';
import { useHttp } from '../../lib/kibana';
import { initializeSecuritySolution } from './api';
import type { InitializationFlowResult, SettledInitializationState } from './types';

/**
 * Provides centralized initialization flows for Security Solution.
 *
 * The provider calls `POST /api/security_solution/initialize` to create or
 * verify resources (list indices, data views, etc.) that the app depends on.
 * Each resource is represented by an **initialization flow** identified by an
 * {@link InitializationFlowId}.
 *
 * **Key behaviors:**
 * - **Deduplication** — concurrent requests for the same flow are collapsed
 *   into a single HTTP call (`inflightRef`).
 * - **Retry** — failed flows are retried up to `DEFAULT_MAX_RETRIES` times
 *   before settling as an error (`retryCountRef`).
 * - **Settled state** — once a flow reaches a terminal state (success or
 *   budget-exhausted error) it is stored in `settledState` and never
 *   re-requested.
 * - **Per-flow validation** — each flow's response is validated against its
 *   generated zod schema (`InitializationFlowsResult.shape[flowId]`) so
 *   consumers receive correctly typed payloads.
 *
 * **Adding a new flow:** flows must be idempotent and only create static
 * resources that do not depend on user input. The backend runs them with the
 * internal user, so they must not rely on the request user's privileges.
 *
 * **Usage — consumers should not interact with this context directly.**
 * Instead, use the {@link useSecuritySolutionInitialization} hook:
 *
 * ```tsx
 * const { 'create-list-indices': listIndices } =
 *   useSecuritySolutionInitialization(['create-list-indices']);
 *
 * if (listIndices.loading) return <EuiLoadingSpinner />;
 * if (listIndices.result?.status === 'error') { ... }
 * ```
 */

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
      const newFlows = flows.filter(
        (id) => !inflightRef.current.has(id) && !settledStateRef.current[id]
      );

      if (newFlows.length === 0) {
        return;
      }

      for (const id of newFlows) {
        inflightRef.current.add(id);
      }

      let flowsToRetry: InitializationFlowId[] = [];
      flowsToRetry = newFlows.filter((id) => {
        const count = retryCountRef.current.get(id) ?? 0;
        return count < DEFAULT_MAX_RETRIES;
      });

      try {
        const response = await initializeSecuritySolution({ http, flows: newFlows });

        flowsToRetry = flowsToRetry.filter(
          (id) => response.flows[id]?.status !== INITIALIZATION_FLOW_STATUS_READY
        );

        const flowSchemas = InitializationFlowsResult.shape;
        const toSettle: Array<[InitializationFlowId, InitializationFlowResult<unknown>]> =
          Object.entries(response.flows).map(([key, flowResult]) => {
            const id = key as InitializationFlowId;
            const schema = flowSchemas[id];

            if (!schema) {
              if (flowResult.status === INITIALIZATION_FLOW_STATUS_READY) {
                return [id, { status: INITIALIZATION_FLOW_STATUS_READY, payload: null }];
              }
              return [id, { status: INITIALIZATION_FLOW_STATUS_ERROR, error: flowResult.error }];
            }

            const parsed = schema.safeParse(flowResult);
            if (!parsed.success) {
              return [
                id,
                {
                  status: INITIALIZATION_FLOW_STATUS_ERROR,
                  error: `Invalid response for flow '${id}': ${parsed.error.message}`,
                },
              ];
            }

            if (parsed.data?.status === INITIALIZATION_FLOW_STATUS_READY) {
              return [
                id,
                {
                  status: INITIALIZATION_FLOW_STATUS_READY,
                  payload: (parsed.data as { payload?: unknown }).payload ?? null,
                },
              ];
            }
            return [
              id,
              {
                status: INITIALIZATION_FLOW_STATUS_ERROR,
                error: (parsed.data as { error?: string | null }).error ?? null,
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

        const toSettle = newFlows.filter((id) => !flowsToRetry.includes(id));

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

      for (const id of flowsToRetry) {
        retryCountRef.current.set(id, (retryCountRef.current.get(id) ?? 0) + 1);
      }

      for (const id of newFlows) {
        inflightRef.current.delete(id);
      }

      if (flowsToRetry.length > 0) {
        requestInitialization(flowsToRetry);
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
