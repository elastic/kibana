/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { GetEventsResponse } from '@kbn/investigation-shared';
import { useQuery } from '@tanstack/react-query';
import { isArray } from 'lodash';
import { investigationKeys } from './query_key_factory';
import { useKibana } from './use_kibana';

export interface Response {
  isLoading: boolean;
  isError: boolean;
  data?: GetEventsResponse;
}

export function useFetchEvents({
  rangeFrom,
  rangeTo,
  filter,
  eventTypes,
}: {
  rangeFrom?: string;
  rangeTo?: string;
  filter?: string;
  eventTypes?: string[];
}): Response {
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  const { isLoading, isError, data } = useQuery({
    queryKey: investigationKeys.events({ rangeFrom, rangeTo, filter, eventTypes }),
    queryFn: async ({ signal }) => {
      return http.get<GetEventsResponse>(`/api/observability/events`, {
        query: {
          rangeFrom,
          rangeTo,
          filter,
          ...(isArray(eventTypes) && eventTypes.length > 0 && { eventTypes: eventTypes.join(',') }),
        },
        version: '2023-10-31',
        signal,
      });
    },
    refetchOnWindowFocus: false,
    retry: false,
    onError: (error: Error) => {
      toasts.addError(error, {
        title: i18n.translate('xpack.investigateApp.events.fetch.error', {
          defaultMessage: 'Something went wrong while fetching the events',
        }),
      });
    },
  });

  return {
    data,
    isLoading,
    isError,
  };
}
