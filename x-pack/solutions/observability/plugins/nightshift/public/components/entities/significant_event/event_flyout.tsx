/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { FlyoutTemplate, type FlyoutFooterMenuPanel } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import { useInvestigation } from '@kbn/investigation-output';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useQueryClient } from '@kbn/react-query';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { DetectionFlyout } from '../detection/detection_flyout';
import { DetectionsList } from './detections_list';
import { EventInvestigation } from './event_investigation';
import { TruncatableSummary } from '../../../common/truncatable_summary';
import { SIGNIFICANT_EVENT_SEVERITY } from '../../ui/severity_badge';
import {
  getInvestigationWorkflowStatusLabel,
  isInvestigationInvestigated,
  isInvestigationTerminalFailure,
} from '../../../common/investigation_progress_status';
import { useFlyoutShareUrlCustomAction } from '../../../common/flyout_share_url_button';
import { buildNightshiftEventFlyoutShareUrl } from '../../../common/url_params';
import {
  buildInvestigationConversationChatOptions,
  buildNewSignificantEventChatOptions,
} from '../../../chat/open_significant_event_in_chat';
import { useFormatTimestamp } from '../../../common/format_timestamp';
import { useFetchDetectionOccurrences } from '../../../hooks/use_fetch_detection_occurrences';
import { useFetchEventLifecycle } from '../../../hooks/use_fetch_event_lifecycle';
import { markEventInvestigationCompleteInCache } from '../../../hooks/use_fetch_significant_events';
import { useFetchInvestigationStatuses } from '../../../hooks/use_fetch_investigation_statuses';
import { findDetectionSignal } from '../detection/resolve_detection_signal';
import {
  getInvestigationStatusLabel,
  getStatusColor,
  isInvestigationRunning,
  isNeedsActionStatus,
  SIGNIFICANT_EVENT_STATUS_LABELS,
} from './significant_event_status';
import { useKibana } from '../../../hooks/use_kibana';
import { useBlocksNewActivity } from '../../../data/maintenance/use_significant_events_maintenance';
import { useTriggerEventInvestigation } from '../../../data/significant_events/use_trigger_event_investigation';
import {
  NIGHTSHIFT_EBT_ACTIONS,
  NIGHTSHIFT_EBT_DETAILS,
  NIGHTSHIFT_EBT_ELEMENTS,
} from '../../../common/ebt_constants';
import { setFlyoutMenuCloseButtonEbtProps } from '../../../common/flyout_close_ebt';
import { MarkSignificantEventInactiveModal } from './mark_significant_event_inactive_modal';

const EVENT_FLYOUT_HISTORY_KEY = Symbol('nightshiftEventFlyout');
const INVESTIGATION_MENU_TITLE_MAX_LENGTH = 48;
const SUMMARY_TITLE = i18n.translate('xpack.nightshift.flyout.summaryTitle', {
  defaultMessage: 'Summary',
});
const DETECTIONS_TITLE = i18n.translate('xpack.nightshift.flyout.detectionsTitle', {
  defaultMessage: 'Detections',
});
const INVESTIGATION_TITLE = i18n.translate('xpack.nightshift.flyout.investigationTitle', {
  defaultMessage: 'Investigation',
});
const OPEN_IN_CHAT_LABEL = i18n.translate('xpack.nightshift.flyout.openInChatButtonLabel', {
  defaultMessage: 'Open in chat',
});
const NEW_CHAT_ITEM_LABEL = i18n.translate(
  'xpack.nightshift.flyout.openInChatNewConversationItem',
  {
    defaultMessage: 'New chat about this event',
  }
);
const INVESTIGATION_CHAT_UNAVAILABLE_LABEL = i18n.translate(
  'xpack.nightshift.flyout.openInChatInvestigationUnavailable',
  {
    defaultMessage: 'Investigation chat is still loading',
  }
);
const CHAT_MENU_ARIA_LABEL = i18n.translate('xpack.nightshift.flyout.openInChatMenuAriaLabel', {
  defaultMessage: 'Open in chat options',
});
const INVESTIGATIONS_MENU_TITLE = i18n.translate(
  'xpack.nightshift.flyout.openInChatInvestigationsMenuTitle',
  {
    defaultMessage: 'Investigations',
  }
);
const IN_PROGRESS_CHAT_TOOLTIP = i18n.translate(
  'xpack.nightshift.flyout.openInChatInProgressTooltip',
  {
    defaultMessage:
      'An investigation is still running. You can start a new chat about this significant event.',
  }
);
const RUN_INVESTIGATION_LABEL = i18n.translate(
  'xpack.nightshift.flyout.runInvestigationButtonLabel',
  { defaultMessage: 'Run investigation' }
);
const FOLLOW_UP_INVESTIGATION_LABEL = i18n.translate(
  'xpack.nightshift.flyout.followUpInvestigationButtonLabel',
  { defaultMessage: 'Run follow-up' }
);
const FOLLOW_UP_INVESTIGATION_TOOLTIP = i18n.translate(
  'xpack.nightshift.flyout.followUpInvestigationTooltip',
  {
    defaultMessage:
      'An investigation is already running. This queues a follow-up that starts when it finishes.',
  }
);
const MARK_INACTIVE_LABEL = i18n.translate('xpack.nightshift.flyout.markInactiveActionLabel', {
  defaultMessage: 'Mark significant event inactive',
});

const truncateForMenu = (text: string): string =>
  text.length <= INVESTIGATION_MENU_TITLE_MAX_LENGTH
    ? text
    : `${text.slice(0, INVESTIGATION_MENU_TITLE_MAX_LENGTH - 1)}…`;

export interface EventFlyoutProps {
  event: SignificantEvent;
  onClose: () => void;
}

export function EventFlyout({ event, onClose }: EventFlyoutProps): React.ReactElement {
  const formatTimestamp = useFormatTimestamp();
  const { euiTheme } = useEuiTheme();
  const queryClient = useQueryClient();
  const { agentBuilder, application, http } = useKibana().services;
  const { canManage } = getNightshiftCapabilities(application.capabilities.nightshift);
  const { blocksActivity, activityBlockTooltip } = useBlocksNewActivity();
  const [selectedDetectionId, setSelectedDetectionId] = useState<string>();
  const [isMarkInactiveModalOpen, setIsMarkInactiveModalOpen] = useState(false);
  const lifecycleQuery = useFetchEventLifecycle(event.event_id);
  const { triggerInvestigation, triggeringEventId } = useTriggerEventInvestigation({
    onTriggered: () => {
      void lifecycleQuery.refetch();
    },
  });
  const occurrencesQuery = useFetchDetectionOccurrences(lifecycleQuery.data?.detections ?? []);
  const latestInvestigation = useMemo(() => event.investigations?.at(-1), [event.investigations]);

  const investigationExecutionIds = useMemo(
    () => (latestInvestigation ? [latestInvestigation.workflow_execution_id] : []),
    [latestInvestigation]
  );
  const { data: investigationRunStatuses } =
    useFetchInvestigationStatuses(investigationExecutionIds);
  const latestRunStatus = latestInvestigation
    ? investigationRunStatuses?.[latestInvestigation.workflow_execution_id]
    : undefined;
  const investigationNotFound =
    latestInvestigation != null &&
    investigationRunStatuses != null &&
    latestRunStatus === undefined;
  const availableInvestigation = investigationNotFound ? undefined : latestInvestigation;

  // The recorded id is the investigation (Agent Builder conversation) id.
  const {
    investigation: investigationDetails,
    error: investigationError,
    status: investigationStatus,
  } = useInvestigation({
    http,
    investigationId: availableInvestigation?.workflow_execution_id,
  });
  const conversationId = investigationDetails?.id;

  useEffect(() => {
    setSelectedDetectionId(undefined);
  }, [event.event_id]);

  useEffect(() => {
    if (latestInvestigation == null || latestInvestigation.completed_at != null) {
      return;
    }

    if (
      isInvestigationInvestigated(investigationStatus) ||
      isInvestigationTerminalFailure(investigationStatus)
    ) {
      markEventInvestigationCompleteInCache(queryClient, event.event_id);
    }
  }, [event.event_id, investigationStatus, latestInvestigation, queryClient]);

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
    () => buildNightshiftEventFlyoutShareUrl(event.event_id),
    [event.event_id]
  );
  const shareUrlCustomAction = useFlyoutShareUrlCustomAction(getShareUrl);
  const markInactiveAction = useMemo(
    () => ({
      iconType: 'eyeSlash' as const,
      'aria-label': MARK_INACTIVE_LABEL,
      onClick: () => setIsMarkInactiveModalOpen(true),
      ...getEbtProps({
        action: NIGHTSHIFT_EBT_ACTIONS.CLOSE_SIGNIFICANT_EVENT,
        element: NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT,
        detail: NIGHTSHIFT_EBT_DETAILS.NEEDS_ACTION,
      }),
    }),
    []
  );
  const flyoutMenuProps = useMemo(
    () => ({
      trailingActions: [
        ...(canManage && isNeedsActionStatus(event.status) ? [markInactiveAction] : []),
        shareUrlCustomAction,
      ],
    }),
    [canManage, event.status, markInactiveAction, shareUrlCustomAction]
  );
  const openNewChat = useCallback(() => {
    agentBuilder?.openChat(buildNewSignificantEventChatOptions(event));
  }, [agentBuilder, event]);
  const openInvestigationChat = useCallback(() => {
    if (conversationId) {
      agentBuilder?.openChat(buildInvestigationConversationChatOptions(conversationId));
    }
  }, [agentBuilder, conversationId]);
  const latestInvestigationInProgress =
    availableInvestigation != null &&
    availableInvestigation.completed_at == null &&
    investigationStatus !== 'complete';
  const investigationRunning = isInvestigationRunning(event) || latestInvestigationInProgress;
  const investigationActionProps = {
    label: investigationRunning ? FOLLOW_UP_INVESTIGATION_LABEL : RUN_INVESTIGATION_LABEL,
    iconType: 'inspect' as const,
    tooltip:
      activityBlockTooltip ?? (investigationRunning ? FOLLOW_UP_INVESTIGATION_TOOLTIP : undefined),
    onClick: () => triggerInvestigation(event.event_id),
    isDisabled: blocksActivity || triggeringEventId != null,
    isLoading: triggeringEventId === event.event_id,
    'data-test-subj': 'nightshiftEventFlyoutRunInvestigationButton',
    ...getEbtProps({
      action: NIGHTSHIFT_EBT_ACTIONS.START_INVESTIGATION,
      element: NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT,
      detail: isNeedsActionStatus(event.status)
        ? NIGHTSHIFT_EBT_DETAILS.NEEDS_ACTION
        : NIGHTSHIFT_EBT_DETAILS.RESOLVED,
    }),
  };
  const chatMenuPanels = useMemo<FlyoutFooterMenuPanel[]>(
    () => [
      {
        id: 0,
        title: INVESTIGATIONS_MENU_TITLE,
        items: [
          {
            name: truncateForMenu(event.title),
            icon: 'comment',
            disabled: !conversationId,
            toolTipContent: conversationId ? undefined : INVESTIGATION_CHAT_UNAVAILABLE_LABEL,
            onClick: openInvestigationChat,
            'data-test-subj': 'nightshiftEventFlyoutOpenInvestigationChatItem',
            ...getEbtProps({
              action: NIGHTSHIFT_EBT_ACTIONS.OPEN_IN_CHAT,
              element: NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT,
              detail: NIGHTSHIFT_EBT_DETAILS.EXISTING_CONVERSATION,
            }),
          },
          { isSeparator: true },
          {
            name: NEW_CHAT_ITEM_LABEL,
            icon: 'productAgent',
            onClick: openNewChat,
            'data-test-subj': 'nightshiftEventFlyoutStartNewChatItem',
            ...getEbtProps({
              action: NIGHTSHIFT_EBT_ACTIONS.OPEN_IN_CHAT,
              element: NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT,
              detail: NIGHTSHIFT_EBT_DETAILS.NEW_CONVERSATION,
            }),
          },
        ],
      },
    ],
    [conversationId, event.title, openInvestigationChat, openNewChat]
  );
  const investigationBadgeLabel =
    availableInvestigation == null
      ? undefined
      : investigationStatus
      ? getInvestigationWorkflowStatusLabel(investigationStatus)
      : getInvestigationStatusLabel(event);

  return (
    <>
      <FlyoutTemplate
        onClose={onClose}
        size="s"
        type="push"
        session="start"
        historyKey={EVENT_FLYOUT_HISTORY_KEY}
        resizable
        flyoutMenuProps={flyoutMenuProps}
        data-test-subj="nightshiftEventFlyout"
        onClickCapture={(clickEvent: React.MouseEvent<HTMLElement>) =>
          setFlyoutMenuCloseButtonEbtProps(clickEvent, NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT)
        }
      >
        <FlyoutTemplate.Header
          title={event.title}
          description={i18n.translate('xpack.nightshift.flyout.lastUpdatedDescription', {
            defaultMessage: 'Last updated {timestamp}',
            values: { timestamp: formatTimestamp(event['@timestamp']) },
          })}
        >
          <FlyoutTemplate.Header.Badge
            color={euiTheme.colors.severity[SIGNIFICANT_EVENT_SEVERITY[event.severity].color]}
          >
            {SIGNIFICANT_EVENT_SEVERITY[event.severity].label}
          </FlyoutTemplate.Header.Badge>
          <FlyoutTemplate.Header.Badge color={getStatusColor(event.status)}>
            {SIGNIFICANT_EVENT_STATUS_LABELS[event.status]}
          </FlyoutTemplate.Header.Badge>
          {investigationBadgeLabel ? (
            <FlyoutTemplate.Header.Badge color="hollow">
              {investigationBadgeLabel}
            </FlyoutTemplate.Header.Badge>
          ) : null}
        </FlyoutTemplate.Header>
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Section title={SUMMARY_TITLE}>
            <TruncatableSummary summary={event.summary} />
          </FlyoutTemplate.Body.Section>
          <FlyoutTemplate.Body.Section title={DETECTIONS_TITLE}>
            <DetectionsList
              event={event}
              eventId={event.event_id}
              lifecycleQuery={lifecycleQuery}
              occurrencesByRuleUuid={occurrencesQuery.data}
              isLoadingOccurrences={occurrencesQuery.isLoading}
              selectedDetectionId={selectedDetectionId}
              onDetectionClick={(detection) => handleDetectionClick(detection.detection_id)}
            />
          </FlyoutTemplate.Body.Section>
          <FlyoutTemplate.Body.Section title={INVESTIGATION_TITLE}>
            <EventInvestigation
              investigation={availableInvestigation}
              status={investigationStatus}
              details={investigationDetails}
              error={investigationError}
            />
          </FlyoutTemplate.Body.Section>
        </FlyoutTemplate.Body>
        {canManage || (agentBuilder && availableInvestigation) ? (
          <FlyoutTemplate.Footer>
            {canManage ? (
              agentBuilder && availableInvestigation ? (
                <FlyoutTemplate.Footer.SecondaryAction {...investigationActionProps} />
              ) : (
                <FlyoutTemplate.Footer.PrimaryAction {...investigationActionProps} />
              )
            ) : null}
            {agentBuilder && availableInvestigation ? (
              latestInvestigationInProgress ? (
                <FlyoutTemplate.Footer.PrimaryAction
                  label={OPEN_IN_CHAT_LABEL}
                  iconType="productAgent"
                  tooltip={IN_PROGRESS_CHAT_TOOLTIP}
                  onClick={openNewChat}
                  data-test-subj="nightshiftEventFlyoutChatButton"
                  {...getEbtProps({
                    action: NIGHTSHIFT_EBT_ACTIONS.OPEN_IN_CHAT,
                    element: NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT,
                    detail: NIGHTSHIFT_EBT_DETAILS.NEW_CONVERSATION,
                  })}
                />
              ) : (
                <FlyoutTemplate.Footer.PrimaryActionMenu
                  label={OPEN_IN_CHAT_LABEL}
                  panels={chatMenuPanels}
                  aria-label={CHAT_MENU_ARIA_LABEL}
                  data-test-subj="nightshiftEventFlyoutChatButton"
                />
              )
            ) : null}
          </FlyoutTemplate.Footer>
        ) : null}
      </FlyoutTemplate>
      {isMarkInactiveModalOpen ? (
        <MarkSignificantEventInactiveModal
          eventId={event.event_id}
          onClose={() => setIsMarkInactiveModalOpen(false)}
          onSuccess={onClose}
        />
      ) : null}
      {selectedDetection ? (
        <DetectionFlyout
          key={selectedDetection.detection_id}
          detection={selectedDetection}
          event={event}
          signal={selectedDetectionSignal}
          onClose={closeDetectionFlyout}
        />
      ) : null}
    </>
  );
}
