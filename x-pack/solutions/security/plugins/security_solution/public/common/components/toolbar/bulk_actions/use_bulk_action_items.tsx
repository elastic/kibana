/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { useBulkClosingReasonItems } from '@kbn/response-ops-detections-close-reason';
import type { AlertTableContextMenuItem } from '../../../../detections/components/alerts_table/types';
import { FILTER_ACKNOWLEDGED, FILTER_CLOSED, FILTER_OPEN } from '../../../../../common/types';
import type {
  CustomBulkActionGroupId,
  CustomBulkActionProp,
  SetEventsDeleted,
  SetEventsLoading,
  AlertClosingReason,
} from '../../../../../common/types';
import type { TimelineItem } from '../../../../../common/search_strategy';
import * as i18n from './translations';
import { updateAlertStatus } from './update_alerts';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useStartTransaction } from '../../../lib/apm/use_start_transaction';
import { APM_USER_INTERACTIONS } from '../../../lib/apm/constants';
import type { AlertWorkflowStatus } from '../../../types';
import type { OnUpdateAlertStatusError, OnUpdateAlertStatusSuccess } from './types';
import { useAlertCloseInfoModal } from '../../../../detections/hooks/use_alert_close_info_modal';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useRunDocumentWorkflowPanel } from '../../../../detections/components/alerts_table/timeline_actions/use_run_document_workflow_panel';
import { ALERT_STATUS_ACTION_IDS } from '../../../constants/action_ids';

export type BulkActionMenuItem = AlertTableContextMenuItem;

/**
 * Structured groups returned for composed bulk-action menus.
 * `casesItems` and `timelineItems` are sub-partitions of custom bulk actions
 * whose producers set `groupId: 'cases'` or `groupId: 'timeline'` respectively.
 * `customItems` holds any remaining custom actions that declare no group.
 */
export interface BulkActionGroups {
  statusItems: BulkActionMenuItem[];
  casesItems: BulkActionMenuItem[];
  timelineItems: BulkActionMenuItem[];
  customItems: BulkActionMenuItem[];
  workflowItems: BulkActionMenuItem[];
}

export interface BulkActionsProps {
  eventIds: string[];
  currentStatus?: AlertWorkflowStatus;
  query?: string;
  /**
   * Index (pattern) the table is querying. Combined with `query` on "select all" to expand the
   * whole selection server-side for the run-workflow action instead of only the loaded page.
   */
  index?: string | string[];
  setEventsLoading: SetEventsLoading;
  setEventsDeleted: SetEventsDeleted;
  showAlertStatusActions?: boolean;
  onUpdateSuccess?: OnUpdateAlertStatusSuccess;
  onUpdateFailure?: OnUpdateAlertStatusError;
  customBulkActions?: CustomBulkActionProp[];
  data?: TimelineItem[];
  closePopover?: () => void;
  showRunWorkflowActions?: boolean;
}

type CustomActionGroups = Pick<BulkActionGroups, 'casesItems' | 'timelineItems' | 'customItems'>;

const getCustomActionGroup = (groupId?: CustomBulkActionGroupId): keyof CustomActionGroups => {
  switch (groupId) {
    case 'cases':
      return 'casesItems';
    case 'timeline':
      return 'timelineItems';
    default:
      return 'customItems';
  }
};

const getCustomActionGroups = ({
  customBulkActions,
  query,
  closePopover,
  eventIds,
}: Pick<BulkActionsProps, 'customBulkActions' | 'query' | 'closePopover' | 'eventIds'>) => {
  const groups: CustomActionGroups = {
    casesItems: [],
    timelineItems: [],
    customItems: [],
  };

  for (const action of customBulkActions ?? []) {
    const isDisabled = Boolean(query && action.disableOnQuery);
    const menuItem: BulkActionMenuItem = {
      key: action.key,
      disabled: isDisabled,
      'data-test-subj': action['data-test-subj'],
      icon: action.icon,
      toolTipContent: isDisabled ? action.disabledLabel : null,
      onClick: () => {
        closePopover?.();
        action.onClick(eventIds);
      },
      name: action.label,
    };

    groups[getCustomActionGroup(action.groupId)].push(menuItem);
  }

  return groups;
};

export const useBulkActionItems = ({
  eventIds,
  currentStatus,
  query,
  index,
  setEventsLoading,
  showAlertStatusActions = true,
  setEventsDeleted,
  onUpdateSuccess,
  onUpdateFailure,
  customBulkActions,
  data,
  closePopover,
  showRunWorkflowActions = true,
}: BulkActionsProps) => {
  const { addSuccess, addError, addWarning } = useAppToasts();
  const { startTransaction } = useStartTransaction();
  const { promptAlertCloseConfirmation } = useAlertCloseInfoModal();
  const { hasAlertsUpdate } = useAlertsPrivileges();

  const onAlertStatusUpdateSuccess = useCallback(
    (updated: number, conflicts: number, newStatus: AlertWorkflowStatus) => {
      if (conflicts > 0) {
        // Partial failure
        addWarning({
          title: i18n.UPDATE_ALERT_STATUS_FAILED(conflicts),
          text: i18n.UPDATE_ALERT_STATUS_FAILED_DETAILED(updated, conflicts),
        });
      } else {
        let title: string;
        switch (newStatus) {
          case 'closed':
            title = i18n.CLOSED_ALERT_SUCCESS_TOAST(updated);
            break;
          case 'open':
            title = i18n.OPENED_ALERT_SUCCESS_TOAST(updated);
            break;
          case 'acknowledged':
            title = i18n.ACKNOWLEDGED_ALERT_SUCCESS_TOAST(updated);
        }
        addSuccess({ title });
      }
      if (onUpdateSuccess) {
        onUpdateSuccess(updated, conflicts, newStatus);
      }
    },
    [addSuccess, addWarning, onUpdateSuccess]
  );

  const onAlertStatusUpdateFailure = useCallback(
    (newStatus: AlertWorkflowStatus, error: Error) => {
      let title: string;
      switch (newStatus) {
        case 'closed':
          title = i18n.CLOSED_ALERT_FAILED_TOAST;
          break;
        case 'open':
          title = i18n.OPENED_ALERT_FAILED_TOAST;
          break;
        case 'acknowledged':
          title = i18n.ACKNOWLEDGED_ALERT_FAILED_TOAST;
      }
      addError(error, { title });
      if (onUpdateFailure) {
        onUpdateFailure(newStatus, error);
      }
    },
    [addError, onUpdateFailure]
  );

  const onClickUpdate = useCallback(
    async (status: AlertWorkflowStatus, reason?: AlertClosingReason) => {
      if (status === 'closed' && !(await promptAlertCloseConfirmation({ query, ids: eventIds }))) {
        return;
      }

      if (query) {
        startTransaction({ name: APM_USER_INTERACTIONS.BULK_QUERY_STATUS_UPDATE });
      } else if (eventIds.length > 1) {
        startTransaction({ name: APM_USER_INTERACTIONS.BULK_STATUS_UPDATE });
      } else {
        startTransaction({ name: APM_USER_INTERACTIONS.STATUS_UPDATE });
      }

      try {
        setEventsLoading({ eventIds, isLoading: true });
        const response = await updateAlertStatus({
          status,
          query: query && JSON.parse(query),
          signalIds: eventIds,
          reason,
        });

        // TODO: Only delete those that were successfully updated from updatedRules
        setEventsDeleted({ eventIds, isDeleted: true });

        if (response.version_conflicts && eventIds.length === 1) {
          throw new Error(i18n.BULK_ACTION_FAILED_SINGLE_ALERT);
        }

        onAlertStatusUpdateSuccess(response.updated ?? 0, response.version_conflicts ?? 0, status);
      } catch (error) {
        onAlertStatusUpdateFailure(status, error);
      } finally {
        setEventsLoading({ eventIds, isLoading: false });
      }
    },
    [
      setEventsLoading,
      eventIds,
      query,
      setEventsDeleted,
      onAlertStatusUpdateSuccess,
      onAlertStatusUpdateFailure,
      startTransaction,
      promptAlertCloseConfirmation,
    ]
  );

  const { item: alertClosingReasonItem, panels: alertClosingReasonPanels } =
    useBulkClosingReasonItems({
      isEnabled: hasAlertsUpdate ?? false,
      onSubmitCloseReason({ reason }) {
        onClickUpdate(FILTER_CLOSED as AlertWorkflowStatus, reason);
      },
    });

  // Send compact ids only; the server expands them to full source via mget. This avoids
  // embedding every document's `_source` in the request payload (the 1 MB payload wall).
  const workflowDocumentIds = useMemo(() => {
    if (!data) return [];
    return data
      .filter((item) => eventIds.includes(item._id))
      .map((item) => ({
        _id: item._id,
        _index: item._index ?? '',
      }));
  }, [data, eventIds]);

  // On "select all", `query` holds the table's full DSL (filters + time range) and `eventIds`
  // only covers the loaded page. Send the query so the whole selection is expanded server-side.
  const workflowQuerySelection = useMemo(() => {
    if (!query || !index) {
      return undefined;
    }
    try {
      return { query: JSON.parse(query) as QueryDslQueryContainer, index };
    } catch {
      return undefined;
    }
  }, [query, index]);

  const noop = useCallback(() => {}, []);
  const { runWorkflowMenuItem, runDocumentWorkflowPanel } = useRunDocumentWorkflowPanel({
    ...(workflowQuerySelection
      ? { querySelection: workflowQuerySelection }
      : { documentIds: workflowDocumentIds }),
    closePopover: closePopover ?? noop,
  });

  const statusItems = useMemo<BulkActionMenuItem[]>(() => {
    const result: BulkActionMenuItem[] = [];
    if (!showAlertStatusActions || !hasAlertsUpdate) return result;
    if (currentStatus !== FILTER_OPEN) {
      result.push({
        key: ALERT_STATUS_ACTION_IDS.markAsOpen,
        'data-test-subj': 'open-alert-status',
        onClick: () => {
          closePopover?.();
          onClickUpdate(FILTER_OPEN as AlertWorkflowStatus);
        },
        name: i18n.BULK_ACTION_OPEN_SELECTED,
      });
    }
    if (currentStatus !== FILTER_ACKNOWLEDGED) {
      result.push({
        key: ALERT_STATUS_ACTION_IDS.markAsAcknowledged,
        'data-test-subj': 'acknowledged-alert-status',
        onClick: () => {
          closePopover?.();
          onClickUpdate(FILTER_ACKNOWLEDGED as AlertWorkflowStatus);
        },
        name: i18n.BULK_ACTION_ACKNOWLEDGED_SELECTED,
      });
    }
    if (currentStatus !== FILTER_CLOSED) {
      result.push({
        key: alertClosingReasonItem?.key,
        'data-test-subj': alertClosingReasonItem?.['data-test-subj'],
        name: alertClosingReasonItem?.label,
        panel: alertClosingReasonItem?.panel,
      });
    }
    return result;
  }, [
    showAlertStatusActions,
    hasAlertsUpdate,
    currentStatus,
    closePopover,
    onClickUpdate,
    alertClosingReasonItem,
  ]);

  const { casesItems, timelineItems, customItems } = useMemo(
    () => getCustomActionGroups({ customBulkActions, query, closePopover, eventIds }),
    [customBulkActions, query, closePopover, eventIds]
  );

  const workflowItems = useMemo<BulkActionMenuItem[]>(
    () => (showRunWorkflowActions ? runWorkflowMenuItem : []),
    [showRunWorkflowActions, runWorkflowMenuItem]
  );

  const groups = useMemo<BulkActionGroups>(
    () => ({ statusItems, casesItems, timelineItems, customItems, workflowItems }),
    [statusItems, casesItems, timelineItems, customItems, workflowItems]
  );

  const panels = useMemo(
    () =>
      [
        ...alertClosingReasonPanels.map((panel) => {
          return {
            ...panel,
            content: panel.renderContent({
              alertItems: [],
              closePopoverMenu: () => {},
              setIsBulkActionsLoading: () => {},
            }),
          };
        }),
        ...(showRunWorkflowActions ? runDocumentWorkflowPanel : []),
      ] as EuiContextMenuPanelDescriptor[],
    [alertClosingReasonPanels, runDocumentWorkflowPanel, showRunWorkflowActions]
  );

  return useMemo(() => ({ panels, groups }), [panels, groups]);
};
