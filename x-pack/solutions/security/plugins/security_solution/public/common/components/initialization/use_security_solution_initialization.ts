/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useEffect, useMemo } from 'react';
import type { InitializationFlowId } from '../../../../common/api/initialization';
import { InitializationContext } from './initialization_context';
import type { InitializationFlowState, InitializationState } from './types';

const IDLE_STATE: InitializationFlowState = {
  loading: false,
  result: null,
  error: null,
};

/**
 * Requests initialization of one or more flows and returns their state.
 *
 * The provider deduplicates in-flight requests, so calling this hook from
 * multiple components with the same flow IDs triggers only one HTTP call.
 *
 * @example
 * ```tsx
 * const { 'bootstrap-prebuilt-rules': prebuiltRules } =
 *   useSecuritySolutionInitialization(['bootstrap-prebuilt-rules']);
 *
 * if (prebuiltRules.loading) return <EuiLoadingSpinner />;
 * if (prebuiltRules.error) return <EuiCallOut color="danger" title={prebuiltRules.error} />;
 * ```
 */
export const useSecuritySolutionInitialization = (
  flows: InitializationFlowId[]
): InitializationState => {
  const { state, requestInitialization } = useContext(InitializationContext);

  const flowsKey = flows.join(',');

  useEffect(() => {
    if (flows.length > 0) {
      requestInitialization(flows);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowsKey, requestInitialization]);

  return useMemo(() => {
    const result: InitializationState = {};
    for (const id of flows) {
      result[id] = state[id] ?? IDLE_STATE;
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowsKey, state]);
};
