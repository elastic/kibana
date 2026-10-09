/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useInvestigationState } from '@kbn/investigation-output';
import { useQueryClient } from '@kbn/react-query';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { NightshiftMarkIcon } from '@kbn/observability-shared-plugin/public';
import { DetectionFlyout } from '../detection/detection_flyout';
import { DetectionsList } from './detections_list';
import { EventInvestigation } from './event_investigation';
import { EventFlyoutChatFooter } from './event_flyout_chat_footer';
import { InvestigationStatusBadge } from '../investigation/investigation_status_badge';
import { TruncatableSummary } from '../common/truncatable_summary';
import { FlyoutSectionTitle } from '../common/flyout_section_title';
import {
  isInvestigationInvestigated,
  isInvestigationTerminalFailure,
} from '../common/investigation_progress_status';
import { useFlyoutShareUrlCustomAction } from '../common/flyout_share_url_button';
import { buildNightshiftEventFlyoutShareUrl } from '../common/url_params';
import { useFormatTimestamp } from '../common/format_timestamp';
import { useFetchDetectionOccurrences } from '../hooks/use_fetch_detection_occurrences';
import { useFetchEventLifecycle } from '../hooks/use_fetch_event_lifecycle';
import { markEventInvestigationCompleteInCache } from '../hooks/use_fetch_significant_events';
import { findDetectionSignal } from '../detection/resolve_detection_signal';
import {
  isNeedsActionStatus,
  rememberInvestigationTerminalFailure,
} from './significant_event_status';
import { useKibana } from '../hooks/use_kibana';
import { NIGHTSHIFT_EBT_ELEMENTS } from '../common/ebt_constants';
import { setFlyoutMenuCloseButtonEbtProps } from '../common/flyout_close_ebt';

export interface EventFlyoutProps {
  event: SignificantEvent;
  onClose: () => void;
}

export function EventFlyout({ event, onClose }: EventFlyoutProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const formatTimestamp = useFormatTimestamp();
  const queryClient = useQueryClient();
  const { agentBuilder, http } = useKibana().services;
  const [selectedDetectionId, setSelectedDetectionId] = useState<string>();
  const lifecycleQuery = useFetchEventLifecycle(event.event_uuid);
  const occurrencesQuery = useFetchDetectionOccurrences(lifecycleQuery.data?.detections ?? []);
  const latestInvestigation = useMemo(() => event.investigations?.at(-1), [event.investigations]);

  const {
    conversationId,
    error: investigationError,
    state: investigationState,
    status: investigationStatus,
  } = useInvestigationState({
    http,
    workflowExecutionId: latestInvestigation?.workflow_execution_id,
    isRunning: latestInvestigation != null && latestInvestigation.completed_at == null,
  });

  useEffect(() => {
    if (latestInvestigation == null || latestInvestigation.completed_at != null) {
      return;
    }

    if (isInvestigationInvestigated(investigationStatus)) {
      markEventInvestigationCompleteInCache(queryClient, event.event_uuid);
      return;
    }

    if (isInvestigationTerminalFailure(investigationStatus)) {
      rememberInvestigationTerminalFailure(
        latestInvestigation.workflow_execution_id,
        investigationStatus
      );
      markEventInvestigationCompleteInCache(queryClient, event.event_uuid);
    }
  }, [event.event_uuid, investigationStatus, latestInvestigation, queryClient]);

  useEffect(() => {
    if (
      selectedDetectionId &&
      lifecycleQuery.data?.detections.every(
        (detection) => detection.detection_id !== selectedDetectionId
      )
    ) {
      setSelectedDetectionId(undefined);
    }
  }, [lifecycleQuery.data?.detections, selectedDetectionId]);

  const selectedDetection = useMemo(
    () =>
      lifecycleQuery.data?.detections.find(
        (detection) => detection.detection_id === selectedDetectionId
      ),
    [lifecycleQuery.data?.detections, selectedDetectionId]
  );

  const selectedDetectionSignal = useMemo(() => {
    if (!selectedDetection) {
      return undefined;
    }
    return findDetectionSignal(selectedDetection, lifecycleQuery.data?.events);
  }, [lifecycleQuery.data?.events, selectedDetection]);

  const closeDetectionFlyout = useCallback(() => {
    setSelectedDetectionId(undefined);
  }, []);

  const handleDetectionClick = useCallback((detectionId: string) => {
    setSelectedDetectionId((current) => (current === detectionId ? undefined : detectionId));
  }, []);

  const getShareUrl = useCallback(
    () => buildNightshiftEventFlyoutShareUrl(event.event_uuid, event.event_id),
    [event.event_uuid, event.event_id]
  );
  const shareUrlCustomAction = useFlyoutShareUrlCustomAction(getShareUrl);
  const flyoutMenuProps = useMemo(
    () => ({
      title: event.title,
      hideTitle: true,
      customActions: [shareUrlCustomAction],
    }),
    [event.title, shareUrlCustomAction]
  );

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      type="push"
      session="start"
      resizable
      aria-label={event.title}
      flyoutMenuProps={flyoutMenuProps}
      data-test-subj="nightshiftEventFlyout"
      onClickCapture={(clickEvent: React.MouseEvent<HTMLElement>) =>
        setFlyoutMenuCloseButtonEbtProps(clickEvent, NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT)
      }
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{event.title}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiBadge
              color="default"
              css={css`
                .euiBadge__text {
                  align-items: center;
                  display: inline-flex;
                  flex-wrap: nowrap;
                  gap: ${euiTheme.size.xs};
                  line-height: 1;
                }
              `}
            >
              <NightshiftMarkIcon inline size={14} />
              <span>
                {i18n.translate('xpack.nightshift.flyout.badge.significantEventLabel', {
                  defaultMessage: 'Significant Event',
                })}
              </span>
            </EuiBadge>
          </EuiFlexItem>
          {isNeedsActionStatus(event.status) && (
            <EuiFlexItem grow={false}>
              <EuiBadge
                color={euiTheme.colors.backgroundLightDanger}
                css={css`
                  /* EuiBadge derives an inline black/white text color from the
                     custom background; the design wants danger-red text. */
                  color: ${euiTheme.colors.textDanger} !important;
                `}
              >
                {i18n.translate('xpack.nightshift.flyout.badge.needsActionLabel', {
                  defaultMessage: 'Needs action',
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <InvestigationStatusBadge
              event={event}
              investigationStatus={latestInvestigation ? investigationStatus : undefined}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {formatTimestamp(event['@timestamp'])}
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <FlyoutSectionTitle>
          {i18n.translate('xpack.nightshift.flyout.summaryTitle', {
            defaultMessage: 'Summary',
          })}
        </FlyoutSectionTitle>
        <EuiSpacer size="s" />
        <TruncatableSummary summary={event.summary} />

        <EuiSpacer size="l" />

        <DetectionsList
          event={event}
          eventUuid={event.event_uuid}
          lifecycleQuery={lifecycleQuery}
          occurrencesByRuleUuid={occurrencesQuery.data}
          isLoadingOccurrences={occurrencesQuery.isLoading}
          selectedDetectionId={selectedDetectionId}
          onDetectionClick={(detection) => handleDetectionClick(detection.detection_id)}
        />

        <EuiSpacer size="l" />

        <EventInvestigation
          event={event}
          investigation={latestInvestigation}
          status={investigationStatus}
          state={investigationState}
          error={investigationError}
          conversationId={conversationId}
        />
      </EuiFlyoutBody>

      {selectedDetection && (
        <DetectionFlyout
          key={selectedDetection.detection_id}
          detection={selectedDetection}
          event={event}
          signal={selectedDetectionSignal}
          onClose={closeDetectionFlyout}
        />
      )}

      {agentBuilder && latestInvestigation && (
        <EuiFlyoutFooter
          css={css`
            /* The design uses a plain footer instead of EUI's shaded one. */
            background: ${euiTheme.colors.backgroundBasePlain};
            border-top: ${euiTheme.border.thin};
          `}
        >
          <EventFlyoutChatFooter
            event={event}
            investigation={latestInvestigation}
            conversationId={conversationId}
            status={investigationStatus}
          />
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
}
