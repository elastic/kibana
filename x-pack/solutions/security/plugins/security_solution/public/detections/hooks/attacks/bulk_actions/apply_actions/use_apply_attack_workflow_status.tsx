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

/**
 * Props for the applyWorkflowStatus function
 */
interface ApplyAttackWorkflowStatusProps extends BaseApplyAttackProps {
  /** Workflow status to set */
  status: AlertWorkflowStatus;
  /** Optional closing reason (required when status is FILTER_CLOSED) */
  reason?: AlertClosingReason;
}

/**
 * Hook that provides a function to apply workflow status to attack discoveries and optionally related detection alerts.
 * Shows a confirmation modal to let users choose whether to update only attack discoveries or both attack discoveries and related detection alerts.
 *
 * @returns Object containing the applyWorkflowStatus function
 *
 * @example
 * ```tsx
 * const { applyWorkflowStatus } = useApplyAttackWorkflowStatus();
 * await applyWorkflowStatus({
 *   status: 'open',
 *   attackIds: ['attack-1', 'attack-2'],
 *   relatedAlertIds: ['alert-1', 'alert-2'],
 *   setIsLoading: (loading) => setLoading(loading),
 *   onSuccess: () => console.log('Success'),
 * });
 * ```
 */
export const useApplyAttackWorkflowStatus = () => {
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
