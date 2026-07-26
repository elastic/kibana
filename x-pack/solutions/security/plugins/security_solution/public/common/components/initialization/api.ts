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
} from '../../../../common/api/initialization';
import { INITIALIZE_SECURITY_SOLUTION_URL } from '../../../../common/api/initialization';

/**
 * Calls the initialization endpoint. The provider validates the response
 * against the generated InitializationFlowsResult zod schema.
 */
export const initializeSecuritySolution = ({
  http,
  flows,
  signal,
}: {
  http: HttpSetup;
  flows: InitializationFlowId[];
  signal?: AbortSignal;
}): Promise<InitializeSecuritySolutionResponse> =>
  http.fetch<InitializeSecuritySolutionResponse>(INITIALIZE_SECURITY_SOLUTION_URL, {
    version: '2023-10-31',
    method: 'POST',
    body: JSON.stringify({ flows }),
    signal,
  });
