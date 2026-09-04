/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '../utils/kibana_react';

const getStatusQuery = (alertId: string) => ({
  concurrency_key: alertId,
  sort_field: 'created_at' as const,
  sort_order: 'desc' as const,
  size: 1,
});

export const useInvestigateAlert = ({
  alertId,
  onInvestigate,
}: {
  alertId?: string;
  onInvestigate?: () => void;
}) => {
  const { http, notifications, nightshiftInvestigations } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;
  const statusQueryKey = ['alertInvestigations', http.basePath.get?.() ?? '', alertId] as const;
  const queryClient = useQueryClient();
  const canInvestigate = Boolean(alertId && investigationsClient);
  const { data: availability } = useQuery({
    queryKey: ['investigationAvailability', http.basePath.get?.() ?? ''],
    queryFn: ({ signal }) =>
      investigationsClient!.fetch('GET /internal/nightshift/investigations/availability', {
        signal: signal ?? null,
      }),
    enabled: canInvestigate,
    retry: false,
    staleTime: 30_000,
  });
  const { data: investigations } = useQuery({
    queryKey: statusQueryKey,
    queryFn: ({ signal }) =>
      investigationsClient!.fetch('GET /internal/nightshift/investigations', {
        signal: signal ?? null,
        params: { query: getStatusQuery(alertId ?? '') },
      }),
    enabled: canInvestigate && availability?.available === true,
    retry: false,
    refetchInterval: (data) =>
      data?.results[0]?.status === 'pending' || data?.results[0]?.status === 'running'
        ? 5_000
        : false,
  });
  const [isStarting, setIsStarting] = useState(false);
  const latestStatus = investigations?.results[0]?.status;
  const hasOngoingInvestigation = latestStatus === 'pending' || latestStatus === 'running';
  const isInvestigating = isStarting || hasOngoingInvestigation;
  const showInvestigateAction = availability?.available === true;
  const investigateActionLabel = isInvestigating
    ? i18n.translate('xpack.observability.alerts.investigating', {
        defaultMessage: 'Investigating',
      })
    : latestStatus === 'completed'
    ? i18n.translate('xpack.observability.alerts.reinvestigate', {
        defaultMessage: 'Re-investigate',
      })
    : i18n.translate('xpack.observability.alerts.investigate', {
        defaultMessage: 'Investigate',
      });

  const handleInvestigate = async () => {
    if (!alertId || !investigationsClient || isInvestigating) return;

    setIsStarting(true);
    onInvestigate?.();
    try {
      await investigationsClient.fetch('POST /internal/nightshift/investigations', {
        signal: null,
        params: {
          body: { subject: { type: 'alert', id: alertId }, concurrency_key: alertId },
        },
      });
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.observability.alerts.investigationStarted', {
          defaultMessage: 'Investigation started',
        }),
      });
      await queryClient.invalidateQueries(statusQueryKey);
    } catch (error) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.observability.alerts.investigationFailed', {
          defaultMessage: 'Failed to start investigation',
        }),
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsStarting(false);
    }
  };

  return { showInvestigateAction, handleInvestigate, isInvestigating, investigateActionLabel };
};
