/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IToasts } from '@kbn/core/public';
import { QueryClient, QueryCache } from '@tanstack/react-query';
import { getErrorCode, getErrorMessage, isKibanaServerError } from '../utils/get_error_message';

export function initQueryClient(toasts: IToasts): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        // 404s are often functionally okay and shouldn't show toasts by default
        if (getErrorCode(error) === 404) {
          return;
        }
        if (isKibanaServerError(error) && !error.skipToast) {
          toasts.addError(error, {
            title: error.name,
            toastMessage: getErrorMessage(error),
            toastLifeTimeMs: 1000,
          });
        }
      },
    }),
  });
}
