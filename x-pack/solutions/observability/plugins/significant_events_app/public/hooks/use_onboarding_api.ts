/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import type { KIsOnboardingStep } from '@kbn/significant-events-schema';
import { useMemo } from 'react';
import { useKibana } from './use_kibana';
import { getLast24HoursTimeRange } from '../util/time_range';

export interface ScheduleOnboardingOptions {
  steps?: KIsOnboardingStep[];
  connectors?: {
    features?: string;
    queries?: string;
  };
}

export function useOnboardingApi() {
  const { significantEventsRepositoryClient } = useKibana().dependencies.start.significantEvents;

  const { signal } = useAbortController();

  return useMemo(
    () => ({
      scheduleOnboarding: async (sourceId: string, options?: ScheduleOnboardingOptions) => {
        const { from, to } = getLast24HoursTimeRange();

        return significantEventsRepositoryClient.fetch(
          'POST /internal/streams/{sourceId}/onboarding/_execute',
          {
            signal,
            params: {
              path: { sourceId },
              body: {
                action: 'schedule' as const,
                from,
                to,
                ...(options?.steps !== undefined && { steps: options.steps }),
                ...(options?.connectors !== undefined && { connectors: options.connectors }),
              },
            },
          }
        );
      },
      getOnboardingStatus: async (sourceId: string) => {
        return significantEventsRepositoryClient.fetch(
          'GET /internal/streams/{sourceId}/onboarding/_status',
          {
            signal,
            params: {
              path: { sourceId },
            },
          }
        );
      },
      getOnboardingStatuses: async (sourceIds: string[]) => {
        return significantEventsRepositoryClient.fetch(
          'POST /internal/streams/onboarding/_bulk_status',
          {
            signal,
            params: {
              body: { sourceIds },
            },
          }
        );
      },
      cancelOnboarding: async (sourceId: string) => {
        await significantEventsRepositoryClient.fetch(
          'POST /internal/streams/{sourceId}/onboarding/_execute',
          {
            signal,
            params: {
              path: { sourceId },
              body: {
                action: 'cancel' as const,
              },
            },
          }
        );
      },
    }),
    [signal, significantEventsRepositoryClient]
  );
}
