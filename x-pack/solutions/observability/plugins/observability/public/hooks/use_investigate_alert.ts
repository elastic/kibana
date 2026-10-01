/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo, useCallback } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { i18n } from '@kbn/i18n';
import {
  NIGHTSHIFT_INVESTIGATION_LOCATOR_ID,
  type InvestigationLocatorParams,
  type InvestigationStatus,
  type InvestigationSubjectType,
} from '@kbn/nightshift-investigations-plugin/common';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { useKibana } from '../utils/kibana_react';
import { getInvestigationsClient } from '../services/investigations_client';

export const VIEWED_INVESTIGATIONS_STORAGE_KEY = 'xpack.observability.viewedInvestigationIds';
export const MAX_VIEWED_INVESTIGATIONS = 200;

const getStatusQuery = (alertId: string) => ({
  concurrency_key: alertId,
  statuses: [
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled',
  ] satisfies InvestigationStatus[],
  subject_types: ['alert'] satisfies InvestigationSubjectType[],
  sort_field: 'created_at' as const,
  sort_order: 'desc' as const,
  size: 1,
});

export const useInvestigationAvailability = () => {
  const kibana = useKibana();
  const basePath = kibana?.services?.http?.basePath?.get?.() ?? '';
  const investigationsClient = getInvestigationsClient();

  return useQuery({
    queryKey: ['investigationAvailability', basePath],
    queryFn: ({ signal }) =>
      investigationsClient!.fetch('GET /internal/nightshift/investigations/availability', {
        signal: signal ?? null,
      }),
    enabled: Boolean(investigationsClient),
    retry: false,
    staleTime: 30_000,
  });
};

export const useInvestigateAlert = ({
  alertId,
  ebtElement,
  enabled = true,
  onInvestigate,
}: {
  alertId?: string;
  ebtElement: string;
  enabled?: boolean;
  onInvestigate?: () => void;
}) => {
  const kibana = useKibana();
  const services = kibana?.services;
  const investigationsClient = getInvestigationsClient();
  const investigationLocator = services?.share?.url?.locators?.get<InvestigationLocatorParams>(
    NIGHTSHIFT_INVESTIGATION_LOCATOR_ID
  );
  const basePath = services?.http?.basePath?.get?.() ?? '';
  const statusQueryKey = ['alertInvestigations', basePath, alertId] as const;
  const queryClient = useQueryClient();
  const { data: availability } = useInvestigationAvailability();
  const canInvestigate = Boolean(enabled && alertId && investigationsClient);
  const { data: investigations, isSuccess: isStatusLoaded } = useQuery({
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
  const [viewedInvestigationIds = [], setViewedInvestigationIds] = useLocalStorage<string[]>(
    VIEWED_INVESTIGATIONS_STORAGE_KEY,
    []
  );
  const [isStarting, setIsStarting] = useState(false);
  const latestInvestigation = investigations?.results[0];
  const latestStatus = latestInvestigation?.status;
  const hasOngoingInvestigation = latestStatus === 'pending' || latestStatus === 'running';
  const isInvestigating = isStarting || hasOngoingInvestigation;
  const showInvestigateAction = availability?.available === true;
  const investigationId =
    alertId && latestInvestigation ? latestInvestigation.investigation_id : '';
  const viewInvestigationUrl = useMemo(
    () => (investigationId ? investigationLocator?.getRedirectUrl({ investigationId }) : undefined),
    [investigationId, investigationLocator]
  );

  const markInvestigationViewed = useCallback(() => {
    if (!investigationId) return;
    setViewedInvestigationIds((prev = []) =>
      [investigationId, ...prev.filter((id) => id !== investigationId)].slice(
        0,
        MAX_VIEWED_INVESTIGATIONS
      )
    );
  }, [investigationId, setViewedInvestigationIds]);

  const isFinished = latestStatus === 'failed' || latestStatus === 'cancelled';
  const isOpened = Boolean(investigationId && viewedInvestigationIds.includes(investigationId));

  const showViewInvestigation =
    showInvestigateAction &&
    !isInvestigating &&
    (latestStatus === 'completed' || isFinished) &&
    Boolean(viewInvestigationUrl);
  const showInvestigateButton =
    showInvestigateAction &&
    isStatusLoaded &&
    !isInvestigating &&
    (!latestInvestigation || (latestStatus === 'completed' && isOpened) || isFinished);

  const viewInvestigationActionLabel = i18n.translate(
    'xpack.observability.alerts.viewInvestigationButtonLabel',
    {
      defaultMessage: 'View investigation',
    }
  );
  let investigateActionLabel = i18n.translate('xpack.observability.alerts.investigate', {
    defaultMessage: 'Investigate',
  });
  if (isInvestigating) {
    investigateActionLabel = i18n.translate('xpack.observability.alerts.investigating', {
      defaultMessage: 'Investigating…',
    });
  } else if (latestInvestigation) {
    investigateActionLabel = i18n.translate('xpack.observability.alerts.reinvestigate', {
      defaultMessage: 'Re-investigate',
    });
  }

  const handleInvestigate = async () => {
    if (!alertId || !investigationsClient || isInvestigating) return;

    setIsStarting(true);
    try {
      await investigationsClient.fetch('POST /internal/nightshift/investigations', {
        signal: null,
        params: {
          // TODO(ns-1619 s5): look the alert's investigation up by subject on the shared API.
          body: { subject: { type: 'alert', id: alertId } },
        },
      });
      services?.notifications?.toasts?.addSuccess({
        title: i18n.translate('xpack.observability.alerts.investigationStarted', {
          defaultMessage: 'Investigation started',
        }),
      });
      await queryClient.invalidateQueries(statusQueryKey);
      onInvestigate?.();
    } catch (error) {
      services?.notifications?.toasts?.addDanger({
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
    showInvestigateButton,
    showViewInvestigation,
    handleInvestigate,
    isInvestigating,
    investigateActionLabel,
    investigateEbtProps: getEbtProps({
      action: EBT_CLICK_ACTIONS.START_INVESTIGATION,
      element: ebtElement,
      detail: latestInvestigation ? 'reinvestigation' : undefined,
    }),
    viewInvestigationUrl,
    viewInvestigationActionLabel,
    viewInvestigationEbtProps: getEbtProps({
      action: EBT_CLICK_ACTIONS.VIEW_INVESTIGATION,
      element: ebtElement,
      detail: latestStatus,
    }),
    markInvestigationViewed,
  };
};
