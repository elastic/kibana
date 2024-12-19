/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useMutation } from '@tanstack/react-query';
import type { ResponseActionApiResponse } from '../../../../common/endpoint/types';
import type { ResponseActionGetFileRequestBody } from '../../../../common/api/endpoint';
import { KibanaServices } from '../../../common/lib/kibana';
import { GET_FILE_ROUTE } from '../../../../common/endpoint/constants';

export const useSendGetFileRequest = (
  customOptions?: UseMutationOptions<
    ResponseActionApiResponse,
    IHttpFetchError,
    ResponseActionGetFileRequestBody
  >
): UseMutationResult<
  ResponseActionApiResponse,
  IHttpFetchError,
  ResponseActionGetFileRequestBody
> => {
  return useMutation<ResponseActionApiResponse, IHttpFetchError, ResponseActionGetFileRequestBody>(
    (reqBody) => {
      return KibanaServices.get().http.post<ResponseActionApiResponse>(GET_FILE_ROUTE, {
        body: JSON.stringify(reqBody),
        version: '2023-10-31',
      });
    },
    customOptions
  );
};
