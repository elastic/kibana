/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { BulkActionsConfig } from '@kbn/response-ops-alerts-table/types';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import type { AlertWorkflowStatus } from '../../../../../common/types';
import type { AlertClosingReason } from '../../../../../../common/types';
import { FILTER_ACKNOWLEDGED, FILTER_CLOSED, FILTER_OPEN } from '../../../../../../common/types';
import { useAttacksPrivileges } from '../use_attacks_privileges';
import { extractRelatedDetectionAlertIds } from '../utils/extract_related_detection_alert_ids';
import { useApplyAttackWorkflowStatus } from '../apply_actions/use_apply_attack_workflow_status';
import { useBulkAlertClosingReasonItems } from '../../../../../common/components/toolbar/bulk_actions/use_bulk_alert_closing_reason_items';
import * as i18n from '../translations';
import type { AttackContentPanelConfig, BulkAttackActionItems } from '../types';

export interface UseBulkAttackWorkflowStatusItemsProps {
  /** Callback when workflow status is updated */
  onWorkflowStatusUpdate?: () => void;
  /** Current workflow status of selected alerts */
  currentStatus?: AlertWorkflowStatus;
}

/**
 * Hook that provides bulk action items and panels for updating workflow status on attacks.
 * Handles both attacks only and attacks + related alerts updates.
 */
export const useBulkAttackWorkflowStatusItems = ({
  onWorkflowStatusUpdate,
  currentStatus,
}: UseBulkAttackWorkflowStatusItemsProps = {}): BulkAttackActionItems => {
  const { hasIndexWrite, hasAttackIndexWrite, loading } = useAttacksPrivileges();
  const { applyWorkflowStatus } = useApplyAttackWorkflowStatus();

  const handleStatusUpdate = useCallback(
    (status: AlertWorkflowStatus, reason?: AlertClosingReason) => {
      return (async (alertItems, _, setAlertLoading) => {
        const attackIds = alertItems.map((item) => item._id);
        const relatedAlertIds = extractRelatedDetectionAlertIds(alertItems);

        await applyWorkflowStatus({
          status,
          reason,
          attackIds,
          relatedAlertIds,
          setIsLoading: setAlertLoading,
          onSuccess: onWorkflowStatusUpdate,
        });
      }) as Required<BulkActionsConfig>['onClick'];
    },
    [applyWorkflowStatus, onWorkflowStatusUpdate]
  );

  const onSubmitCloseReason = useCallback(
    async ({ alertItems, reason }: { alertItems: TimelineItem[]; reason?: AlertClosingReason }) => {
      const attackIds = alertItems.map((item) => item._id);
      const relatedAlertIds = extractRelatedDetectionAlertIds(alertItems);

      await applyWorkflowStatus({
        status: FILTER_CLOSED as AlertWorkflowStatus,
        reason,
        attackIds,
        relatedAlertIds,
        onSuccess: onWorkflowStatusUpdate,
      });
    },
    [applyWorkflowStatus, onWorkflowStatusUpdate]
  );

  const { item: alertClosingReasonItem, panels: alertClosingReasonPanels } =
    useBulkAlertClosingReasonItems({ onSubmitCloseReason });

  const workflowStatusItems: BulkActionsConfig[] = useMemo(() => {
    // Return empty array if user doesn't have required permissions or data is still loading
    if (loading || !hasIndexWrite || !hasAttackIndexWrite) {
      return [];
    }

    const items: BulkActionsConfig[] = [];

    // Add "Open" action if current status is not already open
    if (currentStatus !== FILTER_OPEN) {
      items.push({
        label: i18n.BULK_ACTION_OPEN_SELECTED,
        key: 'open-attack-status',
        'data-test-subj': 'open-attack-status',
        onClick: handleStatusUpdate(FILTER_OPEN as AlertWorkflowStatus),
        disableOnQuery: true,
      });
    }

    // Add "Acknowledged" action if current status is not already acknowledged
    if (currentStatus !== FILTER_ACKNOWLEDGED) {
      items.push({
        label: i18n.BULK_ACTION_ACKNOWLEDGED_SELECTED,
        key: 'acknowledge-attack-status',
        'data-test-subj': 'acknowledged-attack-status',
        onClick: handleStatusUpdate(FILTER_ACKNOWLEDGED as AlertWorkflowStatus),
        disableOnQuery: true,
      });
    }

    // Add "Close" action if current status is not already closed
    if (currentStatus !== FILTER_CLOSED) {
      items.push({
        label: alertClosingReasonItem?.label ?? i18n.BULK_ACTION_CLOSE_SELECTED,
        key: alertClosingReasonItem?.key ?? 'closed-attack-status',
        'data-test-subj': alertClosingReasonItem?.['data-test-subj'],
        panel: alertClosingReasonItem?.panel,
        disableOnQuery: true,
      });
    }

    return items;
  }, [
    alertClosingReasonItem,
    currentStatus,
    hasIndexWrite,
    hasAttackIndexWrite,
    loading,
    handleStatusUpdate,
  ]);

  const workflowStatusPanels: AttackContentPanelConfig[] = useMemo(
    () => [...alertClosingReasonPanels],
    [alertClosingReasonPanels]
  );

  return useMemo(
    () => ({
      items: workflowStatusItems,
      panels: workflowStatusPanels,
    }),
    [workflowStatusItems, workflowStatusPanels]
  );
};
