/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IToasts } from '@kbn/core/public';
import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query';
import { getErrorCode, getErrorMessage, isKibanaServerError } from '../utils/errors';

export function initQueryClient(toasts: IToasts): QueryClient {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (e, _vars, _ctx, _mutation) => {
        // TODO: can we verify this instead of a blind cast?
        const error = e as Error;
        toasts.addError(error, {
          title: error.name,
          toastMessage: getErrorMessage(error),
          toastLifeTimeMs: 1000,
        });
      },
    }),
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
