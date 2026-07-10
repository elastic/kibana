/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { EventLifecycleResponse } from '@kbn/significant-events-schema';
import { useKibana } from '../../../utils/kibana_react';

export const useFetchEventLifecycle = (eventId: string | undefined) => {
  const { http } = useKibana().services;

  return useQuery<EventLifecycleResponse, Error>({
    queryKey: ['nightshift.eventLifecycle', eventId],
    queryFn: async ({ signal }) => {
      return http.get<EventLifecycleResponse>(
        `/internal/significant_events/events/${eventId}/lifecycle`,
        { signal }
      );
    },
    enabled: !!eventId,
  });
};
