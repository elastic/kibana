/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  UseAbortableAsync,
  useAbortableAsync,
} from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { omit } from 'lodash';
import { isRequestAbortedError } from '@kbn/server-route-repository-client';
import { useKibana } from './use_kibana';

export const useStreamsAppFetch: UseAbortableAsync<{}, { disableToastOnError?: boolean }> = (
  callback,
  deps,
  options
) => {
  const {
    core: { notifications },
  } = useKibana();

  const onError = (error: Error) => {
    let requestUrl: string | undefined;

    if (!options?.disableToastOnError && !isRequestAbortedError(error)) {
      if (
        'body' in error &&
        typeof error.body === 'object' &&
        !!error.body &&
        'message' in error.body &&
        typeof error.body.message === 'string'
      ) {
        error.message = error.body.message;
      }

      if (
        'request' in error &&
        typeof error.request === 'object' &&
        !!error.request &&
        'url' in error.request &&
        typeof error.request.url === 'string'
      ) {
        requestUrl = error.request.url;
      }

      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.streams.failedToFetchError', {
          defaultMessage: 'Failed to fetch data{requestUrlSuffix}',
          values: {
            requestUrlSuffix: requestUrl ? ` (${requestUrl})` : '',
          },
        }),
      });

      // log to console to get the actual stack trace
      // eslint-disable-next-line no-console
      console.log(error);
    }
  };

  const optionsForHook = {
    ...omit(options, 'disableToastOnError'),
    onError,
  };

  return useAbortableAsync(
    ({ signal }) => {
      return callback({ signal });
    },

    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
    optionsForHook
  );
};
