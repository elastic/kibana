/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useEffect, useMemo } from 'react';
import type { InitializationFlowId } from '../../../../common/api/initialization';
import { InitializationContext } from './initialization_context';
import type { FlowPayload, InitializationFlowState } from './types';

const LOADING_STATE = { loading: true, result: null } as const;

type RegistryState<Ids extends InitializationFlowId[]> = {
  [K in Ids[number]]: InitializationFlowState<FlowPayload<K>>;
};

/**
 * Requests initialization of one or more flows and returns their state.
 *
 * The provider deduplicates in-flight requests, so calling this hook from
 * multiple components with the same flow IDs triggers only one HTTP call.
 * Once a flow settles (success or terminal error) it is never re-requested.
 *
 * @example
 * ```tsx
 * const { 'security-data-views': securityDataViews } =
 *   useSecuritySolutionInitialization(['security-data-views']);
 *
 * if (securityDataViews.loading) return <EuiLoadingSpinner />;
 * if (securityDataViews.result?.status === 'error') return <EuiCallOut color="danger" title={securityDataViews.result.error ?? 'Unknown error'} />;
 * const payload = securityDataViews.result?.status === 'ready' ? securityDataViews.result.payload : null;
 * //    ^ typed as SecurityDataViewsPayload | null — no cast needed
 * ```
 */
export const useSecuritySolutionInitialization = <Ids extends InitializationFlowId[]>(
  flows: Ids
): RegistryState<Ids> => {
  const { settledState, requestInitialization } = useContext(InitializationContext);

  const flowsKey = flows.join(',');

  useEffect(() => {
    if (flows.length > 0) {
      requestInitialization(flows);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowsKey, requestInitialization]);

  return useMemo(() => {
    // The assertion to RegistryState<Ids> is safe: the provider validates each
    // flow's result against the generated InitializationFlowsResult zod schema
    // before storing it, so the unknown payload is guaranteed to match.
    const result = {} as RegistryState<Ids>;
    for (const id of flows) {
      const settled = settledState[id];
      (result as Record<string, unknown>)[id] = settled
        ? { loading: false, result: settled }
        : LOADING_STATE;
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowsKey, settledState]);
};
