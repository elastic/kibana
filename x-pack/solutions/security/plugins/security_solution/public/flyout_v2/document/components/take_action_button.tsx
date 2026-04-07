/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { ALERT_WORKFLOW_STATUS, EVENT_KIND } from '@kbn/rule-data-utils';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { EventKind } from '../constants/event_kinds';
import type { TimelineNonEcsData } from '../../../../common/search_strategy';
import type { Status } from '../../../../common/api/detection_engine';
import { useAddToCaseActions } from '../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions';
import { useAlertsActions } from '../../../detections/components/alerts_table/timeline_actions/use_alerts_actions';
import { useAlertAssigneesActions } from '../../../detections/components/alerts_table/timeline_actions/use_alert_assignees_actions';
import { useAlertTagsActions } from '../../../detections/components/alerts_table/timeline_actions/use_alert_tags_actions';
import { useInvestigateInTimeline } from '../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID } from './test_ids';

const TAKE_ACTION = i18n.translate('xpack.securitySolution.flyoutV2.footer.takeActionButtonLabel', {
  defaultMessage: 'Take action',
});

const ADD_NOTE = i18n.translate('xpack.securitySolution.flyoutV2.footer.takeAction.addNoteLabel', {
  defaultMessage: 'Add note',
});

export interface TakeActionButtonProps {
  /**
   * The raw document record, used to extract alert metadata
   */
  hit: DataTableRecord;
  /**
   * ECS data for the document
   */
  ecsData: Ecs;
  /**
   * Non-ECS data for the document
   */
  nonEcsData: TimelineNonEcsData[];
  /**
   * Callback to refetch flyout data
   */
  refetchFlyoutData: () => Promise<void>;
  /**
   * Callback invoked after alert mutations to refresh flyout data.
   */
  onAlertUpdated: () => void;
  /**
   * Callback to open the notes flyout. Shown in the dropdown only for raw events (not alerts).
   */
  onShowNotes: () => void;
}

/**
 * Take action button with dropdown used to show all the options available to the user on a document rendered in the expandable flyout
 * // TODO: refactor all actions to take a DataTableRecord as input.
 */
export const TakeActionButton = memo(
  ({
    hit,
    ecsData,
    nonEcsData,
    refetchFlyoutData,
    onAlertUpdated,
    onShowNotes,
  }: TakeActionButtonProps) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopoverHandler = useCallback(() => {
      setIsPopoverOpen((open) => !open);
    }, []);
    const closePopoverHandler = useCallback(() => {
      setIsPopoverOpen(false);
    }, []);

    const isInSecurityApp = useIsInSecurityApp();

    const eventId = hit.raw._id as string;
    const isAlert = useMemo(
      () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
      [hit]
    );
    const alertStatus = useMemo(() => {
      const rawStatus = getFieldValue(hit, ALERT_WORKFLOW_STATUS);
      return (Array.isArray(rawStatus) ? rawStatus[0] : rawStatus) as Status;
    }, [hit]);

    const { addToCaseActionItems } = useAddToCaseActions({
      ecsData,
      nonEcsData,
      onMenuItemClick: closePopoverHandler,
      onSuccess: refetchFlyoutData,
    });

    const { actionItems: statusActionItems, panels: statusActionPanels } = useAlertsActions({
      alertStatus,
      closePopover: closePopoverHandler,
      eventId,
      scopeId: '',
      refetch: onAlertUpdated,
    });

    const { alertTagsItems, alertTagsPanels } = useAlertTagsActions({
      closePopover: closePopoverHandler,
      ecsRowData: ecsData,
      refetch: onAlertUpdated,
    });

    const onAssigneesUpdate = useCallback(() => {
      onAlertUpdated();
      refetchFlyoutData();
    }, [onAlertUpdated, refetchFlyoutData]);

    const { alertAssigneesItems, alertAssigneesPanels } = useAlertAssigneesActions({
      closePopover: closePopoverHandler,
      ecsRowData: ecsData,
      refetch: onAssigneesUpdate,
    });

    const { investigateInTimelineActionItems } = useInvestigateInTimeline({
      ecsRowData: ecsData,
      onInvestigateInTimelineAlertClick: closePopoverHandler,
    });

    const noteItems = useMemo(
      () => [
        {
          'data-test-subj': 'add-note-action',
          key: 'add-note-action',
          name: ADD_NOTE,
          size: 's' as const,
          onClick: () => {
            closePopoverHandler();
            onShowNotes();
          },
        },
      ],
      [closePopoverHandler, onShowNotes]
    );

    const items = useMemo(
      () => [
        ...addToCaseActionItems,
        ...(isAlert ? statusActionItems : []),
        ...(isAlert ? alertAssigneesItems : []),
        ...(isAlert ? alertTagsItems : []),
        ...(isAlert ? [] : noteItems),
        ...(isInSecurityApp ? investigateInTimelineActionItems : []),
      ],
      [
        addToCaseActionItems,
        alertTagsItems,
        investigateInTimelineActionItems,
        isAlert,
        isInSecurityApp,
        noteItems,
        statusActionItems,
        alertAssigneesItems,
      ]
    );

    const panels = useMemo(
      () => [
        { id: 0, items },
        ...(isAlert ? statusActionPanels : []),
        ...(isAlert ? alertAssigneesPanels : []),
        ...(isAlert ? alertTagsPanels : []),
      ],
      [alertTagsPanels, isAlert, items, statusActionPanels, alertAssigneesPanels]
    );

    const takeActionButton = (
      <EuiButton
        data-test-subj={FLYOUT_FOOTER_DROPDOWN_BUTTON_TEST_ID}
        fill
        iconSide="right"
        iconType="arrowDown"
        onClick={togglePopoverHandler}
      >
        {TAKE_ACTION}
      </EuiButton>
    );

    return (
      <EuiPopover
        id="AlertTakeActionPanel"
        button={takeActionButton}
        isOpen={isPopoverOpen}
        closePopover={closePopoverHandler}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        repositionOnScroll
      >
        <EuiContextMenu
          size="s"
          initialPanelId={0}
          panels={panels}
          data-test-subj="takeActionPanelMenu"
        />
      </EuiPopover>
    );
  }
);

TakeActionButton.displayName = 'TakeActionButton';
