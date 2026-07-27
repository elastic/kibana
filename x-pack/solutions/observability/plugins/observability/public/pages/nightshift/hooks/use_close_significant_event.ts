/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { RouteRepositoryClient } from '@kbn/server-route-repository';
import type { SignificantEventsRouteRepository } from '@kbn/significant-events-plugin/server';
import type { StreamsRouteRepository } from '@kbn/streams-plugin/server';
import type { StreamsRepositoryClientOptions } from '@kbn/streams-plugin/public/api';
import { useKibana } from '../../../utils/kibana_react';
import {
  NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
  type NightshiftSignificantEventsQueryData,
} from './use_fetch_significant_events';

type MergedStreamsRepositoryClient = RouteRepositoryClient<
  StreamsRouteRepository & SignificantEventsRouteRepository,
  StreamsRepositoryClientOptions
>;

const CLOSE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.observability.nightshift.closeEvent.successToastTitle',
  {
    defaultMessage: 'Significant event closed',
  }
);

const CLOSE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.observability.nightshift.closeEvent.errorToastTitle',
  {
    defaultMessage: 'Failed to close significant event',
  }
);

interface UseCloseSignificantEventResult {
  closeEvent: (eventUuid: string) => void;
  closingEventUuid?: string;
}

export const useCloseSignificantEvent = (): UseCloseSignificantEventResult => {
  const { notifications, streams } = useKibana().services;
  const queryClient = useQueryClient();
  const [closingEventUuid, setClosingEventUuid] = useState<string>();
  const streamsRepositoryClient = streams.streamsRepositoryClient as MergedStreamsRepositoryClient;

  const mutation = useMutation({
    mutationFn: (eventUuid: string) =>
      streamsRepositoryClient.fetch('POST /internal/significant_events/events/{id}/update', {
        params: {
          path: { id: eventUuid },
          body: { status: 'closed' },
        },
        signal: null,
      }),
    onMutate: (eventUuid) => {
      setClosingEventUuid(eventUuid);
    },
    onSuccess: (_, eventUuid) => {
      queryClient.setQueryData<NightshiftSignificantEventsQueryData>(
        NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
        (current) =>
          current
            ? {
                ...current,
                hits: current.hits.map((event) =>
                  event.event_uuid === eventUuid ? { ...event, status: 'closed' } : event
                ),
              }
            : current
      );
      notifications.toasts.addSuccess({ title: CLOSE_SUCCESS_TOAST_TITLE });
    },
    onError: (error: Error) => {
      notifications.toasts.addError(error, { title: CLOSE_ERROR_TOAST_TITLE });
    },
    onSettled: async () => {
      setClosingEventUuid(undefined);
      await queryClient.invalidateQueries({
        queryKey: NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
      });
    },
  });

  return {
    closeEvent: (eventUuid) => mutation.mutate(eventUuid),
    closingEventUuid,
  };
};
