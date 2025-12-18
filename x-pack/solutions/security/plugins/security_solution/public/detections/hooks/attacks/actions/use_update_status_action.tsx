/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import { useAttackDiscoveryBulk } from '../../../../attack_discovery/pages/use_attack_discovery_bulk';
import { useUpdateAlertsStatus } from '../../../../attack_discovery/pages/results/take_action/use_update_alerts_status';
import { UpdateAlertsModal } from '../../../../attack_discovery/pages/results/take_action/update_alerts_modal';

import type { AttackActionItem, WorkflowStatus } from './types';
import * as i18n from './translations';

interface Props {
  attackDiscoveryIds: string[];
  alertIds: string[];
  currentWorkflowStatus?: string | null;
}

export const useUpdateWorkflowStatusAction = ({
  attackDiscoveryIds,
  alertIds,
  currentWorkflowStatus,
}: Props) => {
  const { hasSearchAILakeConfigurations } = useAssistantAvailability();

  const [pendingAction, setPendingAction] = useState<WorkflowStatus | null>(null);

  const { mutateAsync: attackDiscoveryBulk } = useAttackDiscoveryBulk();
  const { mutateAsync: updateAlertStatus } = useUpdateAlertsStatus();

  const onConfirm = useCallback(
    async ({
      updateAlerts,
      workflowStatus,
    }: {
      updateAlerts: boolean;
      workflowStatus: WorkflowStatus;
    }) => {
      setPendingAction(null);

      await attackDiscoveryBulk({
        ids: attackDiscoveryIds,
        kibanaAlertWorkflowStatus: workflowStatus,
      });

      if (updateAlerts && alertIds.length > 0) {
        await updateAlertStatus({
          ids: alertIds,
          kibanaAlertWorkflowStatus: workflowStatus,
        });
      }
    },
    [attackDiscoveryBulk, attackDiscoveryIds, alertIds, updateAlertStatus]
  );

  const onUpdateWorkflowStatus = useCallback(
    async (workflowStatus: WorkflowStatus) => {
      setPendingAction(workflowStatus);

      if (hasSearchAILakeConfigurations) {
        // there's no modal for EASE, so we call onConfirm directly
        onConfirm({ updateAlerts: false, workflowStatus });
      }
    },
    [hasSearchAILakeConfigurations, onConfirm]
  );

  const actionItems: AttackActionItem[] = useMemo(() => {
    const isOpen = currentWorkflowStatus === 'open';
    const isAcknowledged = currentWorkflowStatus === 'acknowledged';
    const isClosed = currentWorkflowStatus === 'closed';

    const markAsOpenItem = !isOpen
      ? [{ title: i18n.MARK_AS_OPEN, onClick: () => onUpdateWorkflowStatus('open') }]
      : [];

    const markAsAcknowledgedItem = !isAcknowledged
      ? [
          {
            title: i18n.MARK_AS_ACKNOWLEDGED,
            onClick: () => onUpdateWorkflowStatus('acknowledged'),
          },
        ]
      : [];

    const markAsClosedItem = !isClosed
      ? [{ title: i18n.MARK_AS_CLOSED, onClick: () => onUpdateWorkflowStatus('closed') }]
      : [];

    return [...markAsOpenItem, ...markAsAcknowledgedItem, ...markAsClosedItem].flat();
  }, [currentWorkflowStatus, onUpdateWorkflowStatus]);

  const onCloseOrCancel = useCallback(() => {
    setPendingAction(null);
  }, []);

  const confirmationModal = useMemo(() => {
    return (
      <>
        {pendingAction != null && !hasSearchAILakeConfigurations && (
          <UpdateAlertsModal
            alertsCount={alertIds.length}
            attackDiscoveriesCount={attackDiscoveryIds.length}
            onCancel={onCloseOrCancel}
            onClose={onCloseOrCancel}
            onConfirm={onConfirm}
            workflowStatus={pendingAction}
          />
        )}
      </>
    );
  }, [
    attackDiscoveryIds.length,
    hasSearchAILakeConfigurations,
    onCloseOrCancel,
    alertIds.length,
    pendingAction,
    onConfirm,
  ]);

  return { actionItems, confirmationModal };
};
