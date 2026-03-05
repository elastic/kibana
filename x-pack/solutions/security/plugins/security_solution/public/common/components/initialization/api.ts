/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type {
  InitializationFlowId,
  InitializeSecuritySolutionResponse,
  InitializationStatusResponse,
} from '../../../../common/api/initialization';
import {
  INITIALIZE_SECURITY_SOLUTION_URL,
  INITIALIZATION_STATUS_URL,
} from '../../../../common/api/initialization';

export const initializeSecuritySolution = ({
  http,
  flows,
  force,
  signal,
}: {
  http: HttpSetup;
  flows: InitializationFlowId[];
  force?: boolean;
  signal?: AbortSignal;
}): Promise<InitializeSecuritySolutionResponse> =>
  http.fetch<InitializeSecuritySolutionResponse>(INITIALIZE_SECURITY_SOLUTION_URL, {
    version: '1',
    method: 'POST',
    body: JSON.stringify({ flows, force }),
    signal,
  });

export const fetchInitializationStatus = ({
  http,
  signal,
}: {
  http: HttpSetup;
  signal?: AbortSignal;
}): Promise<InitializationStatusResponse> =>
  http.fetch<InitializationStatusResponse>(INITIALIZATION_STATUS_URL, {
    version: '1',
    method: 'GET',
    signal,
  });
