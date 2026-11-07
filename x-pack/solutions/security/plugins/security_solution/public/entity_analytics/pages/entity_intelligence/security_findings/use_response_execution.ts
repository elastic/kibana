/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '../../../../common/lib/kibana';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import type { FindingResponseEvidence } from './response_evidence';
import { toResponseExecution } from './response_execution_model';
import type { ExecutionValue, ResponseExecution } from './response_execution_model';

interface ResponseExecutionState {
  contextKey?: string;
  execution?: ResponseExecution;
  loading: boolean;
  error?: 'forbidden' | 'not_found' | 'unverified';
}

/** Fetches one recorded execution in the active space only while its flyout is open. */
export const useResponseExecution = (
  response: FindingResponseEvidence
): ResponseExecutionState & { refresh: () => void } => {
  const { http } = useKibana().services;
  const spaceId = useSpaceId();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<ResponseExecutionState>({ loading: true });
  const {
    workflowId,
    executionId,
    triggerAlertId,
    triggerSessionId,
    runtimePrincipal,
    role,
    bucket,
    provider,
    httpStatus,
  } = response;
  const contextKey = JSON.stringify([
    spaceId,
    workflowId,
    executionId,
    triggerAlertId,
    triggerSessionId,
    runtimePrincipal,
    role,
    bucket,
  ]);
  useEffect(() => {
    if (!spaceId) return;
    const abort = new AbortController();
    setState({ loading: true, contextKey });
    http
      .get<ExecutionValue>(`/api/workflows/executions/${encodeURIComponent(executionId)}`, {
        version: '2023-10-31',
        query: { includeInput: true, includeOutput: true },
        signal: abort.signal,
      })
      .then((value) => {
        const execution = toResponseExecution(
          value,
          {
            workflowId,
            executionId,
            triggerAlertId,
            triggerSessionId,
            runtimePrincipal,
            role,
            bucket,
            provider,
            httpStatus,
          },
          spaceId
        );
        if (!abort.signal.aborted) setState({ loading: false, execution, contextKey });
      })
      .catch((error) => {
        if (abort.signal.aborted) return;
        const status = isHttpFetchError(error) ? error.response?.status : undefined;
        setState({
          loading: false,
          contextKey,
          error:
            status === 401 || status === 403
              ? 'forbidden'
              : status === 404
              ? 'not_found'
              : 'unverified',
        });
      });
    return () => abort.abort();
  }, [
    http,
    spaceId,
    workflowId,
    executionId,
    triggerAlertId,
    triggerSessionId,
    runtimePrincipal,
    role,
    bucket,
    provider,
    httpStatus,
    revision,
    contextKey,
  ]);
  return {
    ...(state.contextKey === contextKey ? state : { loading: true }),
    refresh: () => setRevision((current) => current + 1),
  };
};
