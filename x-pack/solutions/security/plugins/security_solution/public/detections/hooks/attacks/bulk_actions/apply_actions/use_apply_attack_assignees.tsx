/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

import type { AlertAssignees } from '../../../../../../common/api/detection_engine';
import { useKibana } from '../../../../../common/lib/kibana';
import { AttacksEventTypes } from '../../../../../common/lib/telemetry';
import { useSetAttacksAssignees } from '../../../../../common/containers/attacks/hooks/use_set_attacks_assignees';

import { useUpdateAttacksModal } from '../confirmation_modal/use_update_attacks_modal';
import type { BaseApplyAttackProps } from '../types';

interface ApplyAttackAssigneesProps extends BaseApplyAttackProps {
  /** Assignees to add or remove */
  assignees: AlertAssignees;
}

interface ApplyAttackAssigneesReturn {
  applyAssignees: (props: ApplyAttackAssigneesProps) => Promise<void>;
}

/**
 * Hook that provides a function to apply assignees to attacks and optionally related alerts.
 * Shows a confirmation modal to let users choose whether to update only attacks or both attacks and related alerts.
 */
export const useApplyAttackAssignees = (): ApplyAttackAssigneesReturn => {
  const { mutateAsync: setAttacksAssignees } = useSetAttacksAssignees();
  const showModalIfNeeded = useUpdateAttacksModal();
  const {
    services: { telemetry },
  } = useKibana();

  const applyAssignees = useCallback(
    async ({
      assignees,
      attackIds,
      relatedAlertIds,
      setIsLoading,
      onSuccess,
      telemetrySource,
    }: ApplyAttackAssigneesProps) => {
      // Show modal (if needed) and wait for user decision
      const result = await showModalIfNeeded({
        alertsCount: relatedAlertIds.length,
        attackDiscoveriesCount: attackIds.length,
      });
      if (result === null) {
        // User cancelled, don't proceed with update
        return;
      }

      if (telemetrySource) {
        telemetry.reportEvent(AttacksEventTypes.ActionAssigneeUpdated, {
          source: telemetrySource,
          scope: result.updateAlerts ? 'attack_and_related_alerts' : 'attack_only',
        });
      }

      setIsLoading?.(true);
      try {
        await setAttacksAssignees({
          ids: attackIds,
          assignees,
          update_related_alerts: result.updateAlerts,
        });
        onSuccess?.();
      } finally {
        setIsLoading?.(false);
      }
    },
    [setAttacksAssignees, showModalIfNeeded, telemetry]
  );

  return { applyAssignees };
};
