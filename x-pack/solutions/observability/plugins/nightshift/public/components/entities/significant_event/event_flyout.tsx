/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import {
  FlyoutTemplate,
  type FlyoutFooterMenuItem,
  type FlyoutFooterMenuPanel,
} from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import { useInvestigation } from '@kbn/investigation-output';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import type { SignificantEventResponse } from '@kbn/significant-events-schema';
import { DetectionFlyout } from '../detection/detection_flyout';
import { DetectionsList } from './detections_list';
import { EventInvestigationCard } from './event_investigation_card';
import { EventTimeline } from './event_timeline';
import { TruncatableSummary } from '../../../common/truncatable_summary';
import { SIGNIFICANT_EVENT_SEVERITY } from '../../ui/severity_badge';
import { useFlyoutShareUrlCustomAction } from '../../../common/flyout_share_url_button';
import { buildNightshiftEventFlyoutShareUrl } from '../../../common/url_params';
import {
  buildInvestigationConversationChatOptions,
  buildNewSignificantEventChatOptions,
} from '../../../chat/open_significant_event_in_chat';
import { useFormatTimestamp } from '../../../common/format_timestamp';
import { useFetchDetectionOccurrences } from '../../../hooks/use_fetch_detection_occurrences';
import { useFetchEventLifecycle } from '../../../hooks/use_fetch_event_lifecycle';
import { useFetchInvestigationStatuses } from '../../../hooks/use_fetch_investigation_statuses';
import { findDetectionSignal } from '../detection/resolve_detection_signal';
import {
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
const OVERVIEW_TAB_ID = 'overview';
const TIMELINE_TAB_ID = 'timeline';
const TIMELINE_TITLE = i18n.translate('xpack.nightshift.flyout.timelineTabLabel', {
  defaultMessage: 'Timeline',
});
const TABS = [
  {
    id: OVERVIEW_TAB_ID,
    label: i18n.translate('xpack.nightshift.flyout.overviewTabLabel', {
      defaultMessage: 'Overview',
    }),
  },
  {
    id: TIMELINE_TAB_ID,
    label: TIMELINE_TITLE,
  },
];
const SUMMARY_TITLE = i18n.translate('xpack.nightshift.flyout.whatHappenedTitle', {
  defaultMessage: 'What happened?',
});
const DETECTIONS_TITLE = i18n.translate('xpack.nightshift.flyout.detectionsTitle', {
  defaultMessage: 'Detections',
});
const INVESTIGATION_TITLE = i18n.translate('xpack.nightshift.flyout.investigationTitle', {
  defaultMessage: 'Investigation',
});
const ACTIONS_LABEL = i18n.translate('xpack.nightshift.flyout.actionsButtonLabel', {
  defaultMessage: 'Actions',
});
const OPEN_INVESTIGATION_CHAT_LABEL = i18n.translate(
  'xpack.nightshift.flyout.openInvestigationChatButtonLabel',
  {
    defaultMessage: 'Open investigation in chat',
  }
);
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
const MARK_INACTIVE_LABEL = i18n.translate('xpack.nightshift.flyout.markInactiveButtonLabel', {
  defaultMessage: 'Mark inactive',
});

export interface EventFlyoutProps {
  event: SignificantEventResponse;
  onClose: () => void;
}

export function EventFlyout({ event, onClose }: EventFlyoutProps): React.ReactElement {
  const formatTimestamp = useFormatTimestamp();
  const { euiTheme } = useEuiTheme();
  const { agentBuilder, application, http } = useKibana().services;
  const { canManage } = getNightshiftCapabilities(application.capabilities.nightshift);
  const { blocksActivity, activityBlockTooltip } = useBlocksNewActivity();
  const [selectedDetectionId, setSelectedDetectionId] = useState<string>();
  const [selectedTabId, setSelectedTabId] = useState(OVERVIEW_TAB_ID);
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
  const { investigation: investigationDetails, status: investigationStatus } = useInvestigation({
    http,
    investigationId: availableInvestigation?.workflow_execution_id,
  });
  const conversationId = investigationDetails?.id;

  useEffect(() => {
    setSelectedDetectionId(undefined);
    setSelectedTabId(OVERVIEW_TAB_ID);
  }, [event.event_id]);

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
  const flyoutMenuProps = useMemo(
    () => ({ trailingActions: [shareUrlCustomAction] }),
    [shareUrlCustomAction]
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
    availableInvestigation != null && availableInvestigation.completed_at == null;
  const investigationRunning = isInvestigationRunning(event) || latestInvestigationInProgress;
  const actionMenuPanels = useMemo<FlyoutFooterMenuPanel[]>(() => {
    const items: FlyoutFooterMenuItem[] = [];
    if (canManage) {
      items.push({
        name: investigationRunning ? FOLLOW_UP_INVESTIGATION_LABEL : RUN_INVESTIGATION_LABEL,
        icon: 'inspect',
        toolTipContent:
          activityBlockTooltip ??
          (investigationRunning ? FOLLOW_UP_INVESTIGATION_TOOLTIP : undefined),
        onClick: () => triggerInvestigation(event.event_id),
        disabled: blocksActivity || triggeringEventId != null,
        hasAriaDisabled: true,
        'data-test-subj': 'nightshiftEventFlyoutRunInvestigationButton',
        ...getEbtProps({
          action: NIGHTSHIFT_EBT_ACTIONS.START_INVESTIGATION,
          element: NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT,
          detail: isNeedsActionStatus(event.status)
            ? NIGHTSHIFT_EBT_DETAILS.NEEDS_ACTION
            : NIGHTSHIFT_EBT_DETAILS.RESOLVED,
        }),
      });
    }
    if (agentBuilder && availableInvestigation) {
      if (!latestInvestigationInProgress) {
        items.push({
          name: OPEN_INVESTIGATION_CHAT_LABEL,
          icon: 'comment',
          disabled: !conversationId,
          hasAriaDisabled: true,
          toolTipContent: conversationId ? undefined : INVESTIGATION_CHAT_UNAVAILABLE_LABEL,
          onClick: openInvestigationChat,
          'data-test-subj': 'nightshiftEventFlyoutOpenInvestigationChatItem',
          ...getEbtProps({
            action: NIGHTSHIFT_EBT_ACTIONS.OPEN_IN_CHAT,
            element: NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT,
            detail: NIGHTSHIFT_EBT_DETAILS.EXISTING_CONVERSATION,
          }),
        });
      }
      items.push({
        name: NEW_CHAT_ITEM_LABEL,
        icon: 'productAgent',
        onClick: openNewChat,
        toolTipContent: latestInvestigationInProgress ? IN_PROGRESS_CHAT_TOOLTIP : undefined,
        'data-test-subj': 'nightshiftEventFlyoutStartNewChatItem',
        ...getEbtProps({
          action: NIGHTSHIFT_EBT_ACTIONS.OPEN_IN_CHAT,
          element: NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT,
          detail: NIGHTSHIFT_EBT_DETAILS.NEW_CONVERSATION,
        }),
      });
    }
    if (canManage && isNeedsActionStatus(event.status)) {
      items.push(
        { isSeparator: true },
        {
          name: MARK_INACTIVE_LABEL,
          icon: 'eyeSlash',
          onClick: () => setIsMarkInactiveModalOpen(true),
          ...getEbtProps({
            action: NIGHTSHIFT_EBT_ACTIONS.CLOSE_SIGNIFICANT_EVENT,
            element: NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT,
            detail: NIGHTSHIFT_EBT_DETAILS.NEEDS_ACTION,
          }),
        }
      );
    }
    return items.length ? [{ id: 0, items }] : [];
  }, [
    activityBlockTooltip,
    agentBuilder,
    availableInvestigation,
    blocksActivity,
    canManage,
    conversationId,
    event.event_id,
    event.status,
    investigationRunning,
    latestInvestigationInProgress,
    openInvestigationChat,
    openNewChat,
    triggerInvestigation,
    triggeringEventId,
  ]);

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
        tabs={TABS}
        selectedTabId={selectedTabId}
        onTabChange={setSelectedTabId}
        data-test-subj="nightshiftEventFlyout"
        onClickCapture={(clickEvent: React.MouseEvent<HTMLElement>) =>
          setFlyoutMenuCloseButtonEbtProps(clickEvent, NIGHTSHIFT_EBT_ELEMENTS.EVENT_FLYOUT)
        }
      >
        <FlyoutTemplate.Header
          title={event.title}
          description={formatTimestamp(event.created_at ?? event['@timestamp'])}
        >
          <FlyoutTemplate.Header.Badge
            color={euiTheme.colors.severity[SIGNIFICANT_EVENT_SEVERITY[event.severity].color]}
          >
            {i18n.translate('xpack.nightshift.flyout.severityLabel', {
              defaultMessage: '{severity} severity',
              values: { severity: SIGNIFICANT_EVENT_SEVERITY[event.severity].label },
            })}
          </FlyoutTemplate.Header.Badge>
          <FlyoutTemplate.Header.Badge
            color="hollow"
            toolTipContent={i18n.translate('xpack.nightshift.flyout.confidenceTooltip', {
              defaultMessage:
                'How confident Nightshift is that this is correct, based on evidence strength and consistency.',
            })}
          >
            {i18n.translate('xpack.nightshift.flyout.confidenceLabel', {
              defaultMessage: 'Confidence {percent}%',
              values: { percent: Math.round(event.confidence * 100) },
            })}
          </FlyoutTemplate.Header.Badge>
          <FlyoutTemplate.Header.Badge color={getStatusColor(event.status)}>
            {SIGNIFICANT_EVENT_STATUS_LABELS[event.status]}
          </FlyoutTemplate.Header.Badge>
        </FlyoutTemplate.Header>
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.TabPanel tabId={OVERVIEW_TAB_ID}>
            <FlyoutTemplate.Body.Section title={SUMMARY_TITLE}>
              <TruncatableSummary summary={event.summary} />
            </FlyoutTemplate.Body.Section>
            {availableInvestigation ? (
              <FlyoutTemplate.Body.Section title={INVESTIGATION_TITLE}>
                <EventInvestigationCard
                  event={event}
                  investigation={investigationDetails}
                  status={investigationStatus}
                />
              </FlyoutTemplate.Body.Section>
            ) : null}
            {lifecycleQuery.isLoading ||
            lifecycleQuery.isError ||
            lifecycleQuery.data?.detections.length ? (
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
            ) : null}
          </FlyoutTemplate.Body.TabPanel>
          <FlyoutTemplate.Body.TabPanel tabId={TIMELINE_TAB_ID}>
            <FlyoutTemplate.Body.Section title={TIMELINE_TITLE}>
              <EventTimeline
                event={event}
                lifecycleQuery={lifecycleQuery}
                selectedDetectionId={selectedDetectionId}
                onDetectionClick={handleDetectionClick}
                onEventClick={() => setSelectedTabId(OVERVIEW_TAB_ID)}
              />
            </FlyoutTemplate.Body.Section>
          </FlyoutTemplate.Body.TabPanel>
        </FlyoutTemplate.Body>
        <FlyoutTemplate.Footer>
          <FlyoutTemplate.Footer.PrimaryActionMenu
            label={ACTIONS_LABEL}
            panels={actionMenuPanels}
            data-test-subj="nightshiftEventFlyoutActionsButton"
          />
        </FlyoutTemplate.Footer>
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
