/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions, UseMutationResult } from '@kbn/react-query';
import { useMutation } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { MemoryDumpActionRequestBody } from '../../../../common/api/endpoint/actions/response_actions/memory_dump';
import type { ResponseActionApiResponse } from '../../../../common/endpoint/types';
import { KibanaServices } from '../../../common/lib/kibana';
import { MEMORY_DUMP_ROUTE } from '../../../../common/endpoint/constants';

export type MemoryDumpRequestOptions = Omit<
  UseMutationOptions<ResponseActionApiResponse, IHttpFetchError, MemoryDumpActionRequestBody>,
  'mutationFn'
>;

export type UseSendMemoryDumpRequestResult = UseMutationResult<
  ResponseActionApiResponse,
  IHttpFetchError,
  MemoryDumpActionRequestBody
>;

/**
 * Create a new request for a memory dump response action
 * @param options
 */
export const useSendMemoryDumpRequest = (
  options?: MemoryDumpRequestOptions
): UseSendMemoryDumpRequestResult => {
  return useMutation<ResponseActionApiResponse, IHttpFetchError, MemoryDumpActionRequestBody>(
    (reqBody) => {
      return KibanaServices.get().http.post<ResponseActionApiResponse>(MEMORY_DUMP_ROUTE, {
        body: JSON.stringify(reqBody),
        version: '2023-10-31',
      });
    },
    options
  );
};
