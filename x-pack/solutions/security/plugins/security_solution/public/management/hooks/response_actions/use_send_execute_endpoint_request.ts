/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useMutation } from '@tanstack/react-query';
import { KibanaServices } from '../../../common/lib/kibana';
import { EXECUTE_ROUTE } from '../../../../common/endpoint/constants';
import type { ResponseActionApiResponse } from '../../../../common/endpoint/types';
import type { ExecuteActionRequestBody } from '../../../../common/api/endpoint';

export const useSendExecuteEndpoint = (
  options?: UseMutationOptions<ResponseActionApiResponse, IHttpFetchError, ExecuteActionRequestBody>
): UseMutationResult<ResponseActionApiResponse, IHttpFetchError, ExecuteActionRequestBody> => {
  return useMutation<ResponseActionApiResponse, IHttpFetchError, ExecuteActionRequestBody>(
    (executeActionReqBody) => {
      return KibanaServices.get().http.post<ResponseActionApiResponse>(EXECUTE_ROUTE, {
        body: JSON.stringify(executeActionReqBody),
        version: '2023-10-31',
      });
    },
    options
  );
};
