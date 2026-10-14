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
} from '@kbn/nightshift-investigations-plugin/common';
import type {
  InvestigationSummary,
  ListInvestigationsResponse,
} from '@kbn/agentic-investigations-plugin/common';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { useKibana } from '../utils/kibana_react';
import { getInvestigationsClient } from '../services/investigations_client';

export const VIEWED_INVESTIGATIONS_STORAGE_KEY = 'xpack.observability.viewedInvestigationIds';
export const MAX_VIEWED_INVESTIGATIONS = 200;

/*
 * The shared investigations list API (agenticInvestigations). Spelled out rather than imported,
 * so this plugin does not load the agentic investigations bundle; a test pins them.
 */
export const SHARED_INVESTIGATIONS_URL = '/internal/investigations/investigations';
export const SHARED_INVESTIGATIONS_API_VERSION = '1';

const IN_PROGRESS_REFETCH_INTERVAL_MS = 5_000;

/**
 * A start records the alert as a subject of its investigation only once the investigation's run
 * begins, so for a moment the list does not know about it. The started id counts as in progress
 * until the list shows it, for at most this long.
 */
const PENDING_START_TIMEOUT_MS = 2 * 60_000;

const getAlertInvestigationsQuery = (alertId: string) => ({
  subject_type: 'alert',
  subject_id: alertId,
  sort_field: 'updated_at',
  sort_order: 'desc',
  per_page: 10,
});

/** The investigation an alert's actions refer to: the open one, else the most recent. */
const pickAlertInvestigation = (
  investigations: InvestigationSummary[] | undefined
): InvestigationSummary | undefined =>
  investigations?.find(({ metadata }) => metadata.status === 'open') ?? investigations?.[0];

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
  const http = services?.http;
  const basePath = http?.basePath?.get?.() ?? '';
  const statusQueryKey = ['alertInvestigations', basePath, alertId] as const;
  const queryClient = useQueryClient();
  const { data: availability } = useInvestigationAvailability();
  const [pendingStart, setPendingStart] = useState<{ id: string; at: number } | undefined>();
  const canInvestigate = Boolean(enabled && alertId && investigationsClient && http);
  const isAwaitingStartIn = (data: ListInvestigationsResponse | undefined): boolean =>
    pendingStart !== undefined &&
    Date.now() - pendingStart.at < PENDING_START_TIMEOUT_MS &&
    !data?.results.some(({ id }) => id === pendingStart.id);
  const { data: investigations, isSuccess: isStatusLoaded } = useQuery({
    queryKey: statusQueryKey,
    // Investigations record the alert as a subject, so the shared list finds them by its id.
    queryFn: ({ signal }) =>
      http!.get<ListInvestigationsResponse>(SHARED_INVESTIGATIONS_URL, {
        version: SHARED_INVESTIGATIONS_API_VERSION,
        query: getAlertInvestigationsQuery(alertId ?? ''),
        signal,
      }),
    enabled: canInvestigate && availability?.available === true,
    retry: false,
    refetchInterval: (data: ListInvestigationsResponse | undefined) =>
      isAwaitingStartIn(data) || data?.results.some(({ in_progress: inProgress }) => inProgress)
        ? IN_PROGRESS_REFETCH_INTERVAL_MS
        : false,
  });
  const [viewedInvestigationIds = [], setViewedInvestigationIds] = useLocalStorage<string[]>(
    VIEWED_INVESTIGATIONS_STORAGE_KEY,
    []
  );
  const [isStarting, setIsStarting] = useState(false);
  const latestInvestigation = pickAlertInvestigation(investigations?.results);
  const hasOngoingInvestigation =
    latestInvestigation?.in_progress === true || isAwaitingStartIn(investigations);
  const isInvestigating = isStarting || hasOngoingInvestigation;
  // In the vocabulary of the run statuses this replaced: an investigation nothing works on reads as
  // completed.
  const viewedInvestigationState = latestInvestigation?.in_progress ? 'running' : 'completed';
  const showInvestigateAction = availability?.available === true;
  const investigationId = alertId && latestInvestigation ? latestInvestigation.id : '';
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

  const isOpened = Boolean(investigationId && viewedInvestigationIds.includes(investigationId));

  const showViewInvestigation =
    showInvestigateAction &&
    !isInvestigating &&
    latestInvestigation !== undefined &&
    Boolean(viewInvestigationUrl);
  const showInvestigateButton =
    showInvestigateAction &&
    isStatusLoaded &&
    !isInvestigating &&
    (!latestInvestigation || isOpened);

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
      // An open investigation that already holds the alert is continued, not duplicated.
      const { investigation_id: startedId } = await investigationsClient.fetch(
        'POST /internal/nightshift/investigations',
        {
          signal: null,
          params: { body: { subject: { type: 'alert', id: alertId } } },
        }
      );
      setPendingStart({ id: startedId, at: Date.now() });
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
      detail: latestInvestigation ? viewedInvestigationState : undefined,
    }),
    markInvestigationViewed,
  };
};
