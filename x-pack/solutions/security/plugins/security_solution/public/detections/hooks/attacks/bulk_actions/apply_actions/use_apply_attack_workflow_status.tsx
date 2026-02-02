/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import { FILTER_CLOSED } from '../../../../../../common/types';
import type { AlertClosingReason } from '../../../../../../common/types';
import type { AlertWorkflowStatus } from '../../../../../common/types';
import { useSetUnifiedAlertsWorkflowStatus } from '../../../../../common/containers/unified_alerts/hooks/use_set_unified_alerts_workflow_status';

import { useUpdateAttacksModal } from '../confirmation_modal/use_update_attacks_modal';
import type { BaseApplyAttackProps } from '../types';

interface ApplyAttackWorkflowStatusProps extends BaseApplyAttackProps {
  /** Workflow status to set */
  status: AlertWorkflowStatus;
  /** Optional closing reason (required when status is FILTER_CLOSED) */
  reason?: AlertClosingReason;
}

interface ApplyAttackWorkflowStatusReturn {
  applyWorkflowStatus: (props: ApplyAttackWorkflowStatusProps) => Promise<void>;
}

/**
 * Hook that provides a function to apply workflow status to attacks and optionally related alerts.
 * Shows a confirmation modal to let users choose whether to update only attacks or both attacks and related alerts.
 */
export const useApplyAttackWorkflowStatus = (): ApplyAttackWorkflowStatusReturn => {
  const { mutateAsync: setUnifiedAlertsWorkflowStatus } = useSetUnifiedAlertsWorkflowStatus();
  const showModalIfNeeded = useUpdateAttacksModal();

  const applyWorkflowStatus = useCallback(
    async ({
      status,
      reason,
      attackIds,
      relatedAlertIds,
      setIsLoading,
      onSuccess,
    }: ApplyAttackWorkflowStatusProps) => {
      // Show modal (if needed) and wait for user decision
      const result = await showModalIfNeeded({
        alertsCount: relatedAlertIds.length,
        attackDiscoveriesCount: attackIds.length,
      });
      if (result === null) {
        // User cancelled, don't proceed with update
        return;
      }
      setIsLoading?.(true);
      try {
        // Combine IDs based on user choice
        const allIds = result.updateAlerts ? [...attackIds, ...relatedAlertIds] : attackIds;

        await setUnifiedAlertsWorkflowStatus({
          signal_ids: allIds,
          status,
          ...(status === FILTER_CLOSED && reason ? { reason } : {}),
        });
        onSuccess?.();
      } finally {
        setIsLoading?.(false);
      }
    },
    [setUnifiedAlertsWorkflowStatus, showModalIfNeeded]
  );

  return { applyWorkflowStatus };
};
