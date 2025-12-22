/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { KibanaContextProvider, useKibana } from '../../../../common/lib/kibana';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import { useAttackDiscoveryBulk } from '../../../../attack_discovery/pages/use_attack_discovery_bulk';
import { useUpdateAlertsStatus } from '../../../../attack_discovery/pages/results/take_action/use_update_alerts_status';
import { UpdateAlertsModal } from '../../../../attack_discovery/pages/results/take_action/update_alerts_modal';

import * as i18n from './translations';

export type WorkflowStatus = 'open' | 'acknowledged' | 'closed';

type AttackActionItem = Omit<
  Pick<EuiContextMenuPanelItemDescriptor, 'title' | 'onClick'>,
  'onClick'
> & {
  onClick?: () => void;
};

/**
 * Parameters required by the useUpdateWorkflowStatusAction hook
 */
export interface UseUpdateWorkflowStatusActionParams {
  /**
   * IDs of the selected Attack Discoveries to update
   */
  attackDiscoveryIds: string[];
  /**
   * IDs of the alerts related to the selected Attack Discoveries
   */
  alertIds: string[];
  /**
   * Current workflow status shared by the selected Attack Discoveries
   */
  currentWorkflowStatus?: string | null;
}

/**
 * Hook responsible for generating workflow status actions for Attack Discoveries
 * and coordinating their updates (and optionally their related alerts).
 *
 * In non-EASE projects, it opens a confirmation modal via overlays.openModal.
 * In EASE projects, it updates immediately without a modal.
 */
export const useUpdateWorkflowStatusAction = ({
  attackDiscoveryIds,
  alertIds,
  currentWorkflowStatus,
}: UseUpdateWorkflowStatusActionParams) => {
  const { hasSearchAILakeConfigurations } = useAssistantAvailability();
  const { overlays, services } = useKibana();

  const [pendingAction, setPendingAction] = useState<WorkflowStatus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Bulk mutation for updating workflow status on Attack Discoveries.
  const { mutateAsync: attackDiscoveryBulk } = useAttackDiscoveryBulk();
  // Bulk mutation for updating workflow status on Alerts.
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

      // Always update the Attack Discoveries workflow status
      await attackDiscoveryBulk({
        ids: attackDiscoveryIds,
        kibanaAlertWorkflowStatus: workflowStatus,
      });

      // Optionally update related alerts
      if (updateAlerts && alertIds.length > 0) {
        await updateAlertStatus({
          ids: alertIds,
          kibanaAlertWorkflowStatus: workflowStatus,
        });
      }
    },
    [attackDiscoveryBulk, attackDiscoveryIds, alertIds, updateAlertStatus]
  );

  const onCloseOrCancel = useCallback(() => {
    setPendingAction(null);
  }, []);

  const onUpdateWorkflowStatus = useCallback(
    (workflowStatus: WorkflowStatus) => {
      // EASE: update immediately (no modal)
      setPendingAction(workflowStatus);

      if (hasSearchAILakeConfigurations) {
        // EASE update immediately
        onConfirm({ updateAlerts: false, workflowStatus });
      }

      // non-EASE: trigger modal via effect
    },
    [hasSearchAILakeConfigurations, onConfirm]
  );

  // Open the confirmation modal when needed (non-EASE) and prevent duplicate openings
  useEffect(() => {
    if (hasSearchAILakeConfigurations) return;
    if (pendingAction == null) return;
    if (isModalOpen) return;

    setIsModalOpen(true);

    const modalRef = overlays.openModal(
      <KibanaContextProvider services={services}>
        <UpdateAlertsModal
          alertsCount={alertIds.length}
          attackDiscoveriesCount={attackDiscoveryIds.length}
          workflowStatus={pendingAction}
          onCancel={() => {
            modalRef.close();
            setIsModalOpen(false);
            onCloseOrCancel();
          }}
          onClose={() => {
            modalRef.close();
            setIsModalOpen(false);
            onCloseOrCancel();
          }}
          onConfirm={async (args) => {
            modalRef.close();
            setIsModalOpen(false);
            await onConfirm(args);
          }}
        />
      </KibanaContextProvider>
    );
  }, [
    alertIds.length,
    attackDiscoveryIds.length,
    hasSearchAILakeConfigurations,
    isModalOpen,
    onCloseOrCancel,
    onConfirm,
    overlays,
    pendingAction,
    services,
  ]);

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

  return { actionItems };
};
