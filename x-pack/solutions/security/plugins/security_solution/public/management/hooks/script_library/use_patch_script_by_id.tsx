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
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import type { PatchUpdateRequestBody } from '../../../../common/api/endpoint';
import { useHttp } from '../../../common/lib/kibana';
import { SCRIPTS_LIBRARY_ROUTE_ITEM } from '../../../../common/endpoint/constants';
import { isEditableScriptField } from './common';

type PatchRequest = Partial<Omit<PatchUpdateRequestBody, 'file'>> & { file?: File } & {
  id: string;
};
export const usePatchEndpointScript = (
  scriptData: PatchRequest,
  options: UseMutationOptions<
    EndpointScriptApiResponse,
    IHttpFetchError<ResponseErrorBody>,
    PatchRequest
  > = {}
): UseMutationResult<
  EndpointScriptApiResponse,
  IHttpFetchError<ResponseErrorBody>,
  PatchRequest
> => {
  const http = useHttp();
  return useMutation<EndpointScriptApiResponse, IHttpFetchError<ResponseErrorBody>, PatchRequest>({
    ...options,
    mutationKey: ['patch-script-by-id', scriptData],
    mutationFn: () => {
      const { id, file, ...rest } = scriptData;
      const formData = new FormData();
      if (file) {
        formData.append('file', file, file.name);
      }

      for (const [key, value] of Object.entries(rest)) {
        if (isEditableScriptField(key) && typeof value !== 'undefined') {
          formData.append(key, typeof value !== 'string' ? JSON.stringify(value) : value);
        }
      }
      return http.patch<EndpointScriptApiResponse>(
        resolvePathVariables(SCRIPTS_LIBRARY_ROUTE_ITEM, { script_id: id }),
        {
          version: '2023-10-31',
          body: formData,
          headers: {
            // Allow the browser to set the content type
            'Content-Type': undefined,
          },
        }
      );
    },
  });
};
