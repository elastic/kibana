/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions, UseMutationResult } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useMutation } from '@kbn/react-query';
import type { RunScriptActionRequestBody } from '../../../../common/api/endpoint';
import { KibanaServices } from '../../../common/lib/kibana';
import { RUN_SCRIPT_ROUTE } from '../../../../common/endpoint/constants';
import type { ResponseActionApiResponse } from '../../../../common/endpoint/types';

export type RunScriptRequestCustomOptions = UseMutationOptions<
  ResponseActionApiResponse,
  IHttpFetchError,
  RunScriptActionRequestBody
>;

export type UseSendRunScriptRequestResult = UseMutationResult<
  ResponseActionApiResponse,
  IHttpFetchError,
  RunScriptActionRequestBody
>;

export const useSendRunScriptEndpoint = (
  options?: RunScriptRequestCustomOptions
): UseSendRunScriptRequestResult => {
  return useMutation<ResponseActionApiResponse, IHttpFetchError, RunScriptActionRequestBody>(
    (runScriptActionReqBody) => {
      return KibanaServices.get().http.post<ResponseActionApiResponse>(RUN_SCRIPT_ROUTE, {
        body: JSON.stringify(runScriptActionReqBody),
        version: '2023-10-31',
      });
    },
    options
  );
};
