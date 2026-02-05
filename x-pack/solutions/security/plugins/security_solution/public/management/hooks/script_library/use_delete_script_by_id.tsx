/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions, UseMutationResult } from '@kbn/react-query';
import { useMutation } from '@kbn/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import type { DeleteScriptRequestParams } from '../../../../common/api/endpoint';
import { useHttp } from '../../../common/lib/kibana';
import { SCRIPTS_LIBRARY_ROUTE_ITEM } from '../../../../common/endpoint/constants';

interface ErrorType {
  statusCode: number;
  message: string;
}

export const useDeleteEndpointScript = (
  options: UseMutationOptions<void, IHttpFetchError<ErrorType>, DeleteScriptRequestParams> = {}
): UseMutationResult<void, IHttpFetchError<ErrorType>, DeleteScriptRequestParams> => {
  const http = useHttp();
  return useMutation<void, IHttpFetchError<ErrorType>, DeleteScriptRequestParams>({
    ...options,
    mutationKey: ['delete-script-by-id'],
    mutationFn: ({ script_id }) => {
      return http.delete(resolvePathVariables(SCRIPTS_LIBRARY_ROUTE_ITEM, { script_id }), {
        version: '2023-10-31',
      });
    },
  });
};
