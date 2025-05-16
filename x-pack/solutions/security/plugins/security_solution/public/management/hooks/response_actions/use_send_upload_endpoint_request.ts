/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { ResponseActionApiResponse } from '../../../../common/endpoint/types';
import { useHttp } from '../../../common/lib/kibana';
import { UPLOAD_ROUTE } from '../../../../common/endpoint/constants';
import type { UploadActionUIRequestBody } from '../../../../common/api/endpoint';

export const useSendUploadEndpointRequest = (
  options?: UseMutationOptions<
    ResponseActionApiResponse,
    IHttpFetchError,
    UploadActionUIRequestBody
  >
): UseMutationResult<ResponseActionApiResponse, IHttpFetchError, UploadActionUIRequestBody> => {
  const http = useHttp();

  return useMutation<ResponseActionApiResponse, IHttpFetchError, UploadActionUIRequestBody>(
    ({ file, ...payload }) => {
      const formData = new FormData();

      formData.append('file', file, file.name);

      for (const [key, value] of Object.entries(payload)) {
        if (typeof value !== 'undefined') {
          formData.append(key, typeof value !== 'string' ? JSON.stringify(value) : value);
        }
      }

      return http.post<ResponseActionApiResponse>(UPLOAD_ROUTE, {
        body: formData,
        version: '2023-10-31',
        headers: {
          'Content-Type': undefined, // Important in order to let the browser set the appropriate content type
        },
      });
    },
    options
  );
};
