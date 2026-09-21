/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import type {
  InvestigationStatus,
  InvestigationSubjectType,
} from '@kbn/nightshift-investigations-plugin/common';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '../utils/kibana_react';
import { getInvestigationsClient } from '../services/investigations_client';

const getStatusQuery = (alertId: string) => ({
  concurrency_key: alertId,
  statuses: ['pending', 'running', 'completed'] satisfies InvestigationStatus[],
  subject_types: ['alert'] satisfies InvestigationSubjectType[],
  sort_field: 'created_at' as const,
  sort_order: 'desc' as const,
  size: 1,
});

export const useInvestigationAvailability = () => {
  const { http } = useKibana().services;
  const investigationsClient = getInvestigationsClient();

  return useQuery({
    queryKey: ['investigationAvailability', http.basePath.get?.() ?? ''],
    queryFn: ({ signal }) =>
      investigationsClient!.fetch('GET /internal/nightshift/investigations/availability', {
        signal: signal ?? null,
      }),
    enabled: Boolean(investigationsClient),
    retry: false,
    staleTime: 5 * 60_000,
  });
};

export const useInvestigateAlert = ({
  alertId,
  enabled = true,
  onInvestigate,
}: {
  alertId?: string;
  enabled?: boolean;
  onInvestigate?: () => void;
}) => {
  const { application, http, notifications } = useKibana().services;
  const investigationsClient = getInvestigationsClient();
  const statusQueryKey = ['alertInvestigations', http.basePath.get?.() ?? '', alertId] as const;
  const queryClient = useQueryClient();
  const { data: availability } = useInvestigationAvailability();
  const canInvestigate = Boolean(enabled && alertId && investigationsClient);
  const { data: investigations } = useQuery({
    queryKey: statusQueryKey,
    queryFn: ({ signal }) =>
      investigationsClient!.fetch('GET /internal/nightshift/investigations', {
        signal: signal ?? null,
        params: { query: getStatusQuery(alertId ?? '') },
      }),
    enabled: canInvestigate,
    retry: false,
    refetchInterval: (data) =>
      data?.results.some(({ status }) => status === 'pending' || status === 'running')
        ? 5_000
        : false,
  });
  const [isStarting, setIsStarting] = useState(false);
  const latestInvestigation = investigations?.results[0];
  const latestStatus = latestInvestigation?.status;
  const hasOngoingInvestigation = latestStatus === 'pending' || latestStatus === 'running';
  const isInvestigating = isStarting || hasOngoingInvestigation;
  const showInvestigateAction = availability?.available === true;
  const viewInvestigationUrl =
    alertId && latestInvestigation
      ? application.getUrlForApp(NIGHTSHIFT_APP_ID, {
          path: `?${new URLSearchParams({
            investigationId: latestInvestigation.investigation_id,
          }).toString()}`,
        })
      : undefined;
  const viewInvestigationActionLabel = i18n.translate(
    'xpack.observability.alerts.viewInvestigationButtonLabel',
    {
      defaultMessage: 'View investigation',
    }
  );
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

  return {
    showInvestigateAction,
    handleInvestigate,
    isInvestigating,
    investigateActionLabel,
    viewInvestigationUrl,
    viewInvestigationActionLabel,
  };
};
