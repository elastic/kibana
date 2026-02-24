/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions, UseMutationResult } from '@kbn/react-query';
import { useMutation } from '@kbn/react-query';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { EndpointScriptApiResponse } from '../../../../common/endpoint/types';
import type { CreateScriptRequestBody } from '../../../../common/api/endpoint';
import { useHttp } from '../../../common/lib/kibana';
import { SCRIPTS_LIBRARY_ROUTE } from '../../../../common/endpoint/constants';
import { isEditableScriptField } from './common';

type CreateRequestBody = Omit<CreateScriptRequestBody, 'file'> & { file?: File };
export const usePostEndpointScript = (
  scriptData: CreateRequestBody,
  options: UseMutationOptions<
    EndpointScriptApiResponse,
    IHttpFetchError<ResponseErrorBody>,
    CreateRequestBody
  > = {}
): UseMutationResult<
  EndpointScriptApiResponse,
  IHttpFetchError<ResponseErrorBody>,
  CreateRequestBody
> => {
  const http = useHttp();
  return useMutation<
    EndpointScriptApiResponse,
    IHttpFetchError<ResponseErrorBody>,
    CreateRequestBody
  >({
    ...options,
    mutationKey: ['post-script-upload', scriptData],
    mutationFn: () => {
      const { file, ...rest } = scriptData;
      const formData = new FormData();
      if (file) {
        formData.append('file', file, file.name);
      }

      for (const [key, value] of Object.entries(rest)) {
        if (isEditableScriptField(key) && typeof value !== 'undefined') {
          formData.append(key, typeof value !== 'string' ? JSON.stringify(value) : value);
        }
      }

      return http.post<EndpointScriptApiResponse>(SCRIPTS_LIBRARY_ROUTE, {
        version: '2023-10-31',
        body: formData,
        headers: {
          // Allow the browser to set the content type
          'Content-Type': undefined,
        },
      });
    },
  });
};
