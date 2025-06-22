/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { loadAllActions as loadConnectors } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { useKibana } from './use_kibana';
import { type PlaygroundConnector } from '../types';
import { parsePlaygroundConnectors } from '../utils/playground_connectors';

export const LOAD_CONNECTORS_QUERY_KEY = ['search-playground, load-connectors'];

export const LoadConnectorsQuery = (http: HttpSetup) => async () => {
  const queryResult = await loadConnectors({ http });
  return parsePlaygroundConnectors(queryResult, http);
};

export const useLoadConnectors = (): UseQueryResult<PlaygroundConnector[], IHttpFetchError> => {
  const {
    services: { http, notifications },
  } = useKibana();

  return useQuery(LOAD_CONNECTORS_QUERY_KEY, LoadConnectorsQuery(http), {
    retry: false,
    keepPreviousData: true,
    onError: (error: IHttpFetchError<ResponseErrorBody>) => {
      if (error.name !== 'AbortError') {
        notifications?.toasts?.addError(
          error.body && error.body.message ? new Error(error.body.message) : error,
          {
            title: i18n.translate('xpack.searchPlayground.loadConnectorsError', {
              defaultMessage:
                'Error loading connectors. Please check your configuration and try again.',
            }),
          }
        );
      }
    },
  });
};
