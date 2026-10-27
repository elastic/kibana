/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import useLatest from 'react-use/lib/useLatest';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
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

type AlertInvestigationStart =
  | { status: 'starting'; alertId: string }
  | { status: 'started'; alertId: string; id: string; at: number }
  | null;

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
  const [start, setStart] = useState<AlertInvestigationStart>(null);
  const pendingStart =
    start?.alertId === alertId && start?.status === 'started' ? start : undefined;
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
  const viewedInvestigationIdsRef = useLatest(viewedInvestigationIds);
  const isStarting = start?.alertId === alertId && start?.status === 'starting';
  const latestInvestigation = pickAlertInvestigation(investigations?.results);
  const isAwaitingStart = isAwaitingStartIn(investigations);
  const hasOngoingInvestigation = latestInvestigation?.in_progress === true || isAwaitingStart;
  const isInvestigating = isStarting || hasOngoingInvestigation;
  // In the vocabulary of the run statuses this replaced: an investigation nothing works on reads as
  // completed.
  const viewedInvestigationState = hasOngoingInvestigation ? 'running' : 'completed';
  const showInvestigateAction = availability?.available === true;
  const listedInvestigationId = alertId && isStatusLoaded ? latestInvestigation?.id : undefined;
  const investigationId = isAwaitingStart ? pendingStart?.id : listedInvestigationId;
  const viewInvestigationUrl = useMemo(
    () => (investigationId ? investigationLocator?.getRedirectUrl({ investigationId }) : undefined),
    [investigationId, investigationLocator]
  );

  const markViewed = useCallback(
    (viewedId: string) => {
      const updatedIds = [
        viewedId,
        ...viewedInvestigationIdsRef.current.filter((id) => id !== viewedId),
      ].slice(0, MAX_VIEWED_INVESTIGATIONS);
      setViewedInvestigationIds(updatedIds);
    },
    [setViewedInvestigationIds, viewedInvestigationIdsRef]
  );

  const markInvestigationViewed = useCallback(() => {
    if (!investigationId) return;
    markViewed(investigationId);
  }, [investigationId, markViewed]);

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
    if (!alertId || !investigationsClient || isInvestigating) {
      return;
    }

    setStart({ status: 'starting', alertId });
    try {
      // An open investigation that already holds the alert is continued, not duplicated.
      const { investigation_id: startedId } = await investigationsClient.fetch(
        'POST /internal/nightshift/investigations',
        {
          signal: null,
          params: { body: { subject: { type: 'alert', ids: [alertId] } } },
        }
      );
      setStart((current) =>
        current?.alertId === alertId
          ? { status: 'started', alertId, id: startedId, at: Date.now() }
          : current
      );
      const startedInvestigationUrl = investigationLocator?.getRedirectUrl({
        investigationId: startedId,
      });
      services?.notifications?.toasts?.addSuccess({
        title: i18n.translate('xpack.observability.alerts.investigationStarted', {
          defaultMessage: 'Investigation started',
        }),
        ...(startedInvestigationUrl &&
          services && {
            text: toMountPoint(
              <>
                <EuiText size="s">
                  <p>
                    <FormattedMessage
                      id="xpack.observability.alerts.investigationStartedDescription"
                      defaultMessage="You will find it in Nightshift"
                    />
                  </p>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiButton
                  size="s"
                  color="success"
                  fill
                  href={startedInvestigationUrl}
                  onClick={() => markViewed(startedId)}
                  data-test-subj="alertInvestigationStartedViewLink"
                >
                  {viewInvestigationActionLabel}
                </EuiButton>
              </>,
              services.rendering
            ),
          }),
      });
      await queryClient.invalidateQueries(statusQueryKey);
      onInvestigate?.();
    } catch (error) {
      setStart((current) => (current?.alertId === alertId ? null : current));
      services?.notifications?.toasts?.addDanger({
        title: i18n.translate('xpack.observability.alerts.investigationFailed', {
          defaultMessage: 'Failed to start investigation',
        }),
        text: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return {
    showInvestigateAction,
    showInvestigateButton,
    showViewInvestigation,
    hasInvestigation: latestInvestigation !== undefined || isAwaitingStart,
    handleInvestigate,
    isInvestigating,
    isStarting,
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
      detail: investigationId ? viewedInvestigationState : undefined,
    }),
    markInvestigationViewed,
  };
};
