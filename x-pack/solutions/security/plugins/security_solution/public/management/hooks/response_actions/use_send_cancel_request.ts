/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useMutation, type UseMutationOptions, type UseMutationResult } from '@kbn/react-query';
import type { ResponseActionApiResponse } from '../../../../common/endpoint/types';
import type { CancelActionRequestBody } from '../../../../common/api/endpoint';
import { KibanaServices } from '../../../common/lib/kibana';
import { CANCEL_ROUTE } from '../../../../common/endpoint/constants';

export type CancelRequestCustomOptions = UseMutationOptions<
  ResponseActionApiResponse,
  IHttpFetchError,
  CancelActionRequestBody
>;

export type UseSendCancelRequestResult = UseMutationResult<
  ResponseActionApiResponse,
  IHttpFetchError,
  CancelActionRequestBody
>;
/**
 * Create cancel request
 * @param customOptions
 */
export const useSendCancelRequest = (
  customOptions?: CancelRequestCustomOptions
): UseSendCancelRequestResult => {
  return useMutation<ResponseActionApiResponse, IHttpFetchError, CancelActionRequestBody>(
    (reqBody) => {
      return KibanaServices.get().http.post<ResponseActionApiResponse>(CANCEL_ROUTE, {
        body: JSON.stringify(reqBody),
        version: '2023-10-31',
      });
    },
    customOptions
  );
};
