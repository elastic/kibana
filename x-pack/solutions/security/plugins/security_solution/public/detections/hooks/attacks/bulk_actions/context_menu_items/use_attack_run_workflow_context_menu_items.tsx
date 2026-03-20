/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';
import { useWorkflowsCapabilities, useWorkflowsUIEnabledSetting } from '@kbn/workflows-ui';
import React, { useCallback, useMemo } from 'react';

import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import * as alertsTableI18n from '../../../../components/alerts_table/translations';
import {
  AlertWorkflowsPanel,
  RUN_WORKFLOW_BULK_PANEL_ID,
} from '../../../../components/alerts_table/timeline_actions/use_run_alert_workflow_panel';
import { useAttacksPrivileges } from '../use_attacks_privileges';
import type {
  BaseAttackContextMenuItemsProps,
  BaseAttackProps,
  BulkAttackContextMenuItems,
} from '../types';

export interface UseAttackRunWorkflowContextMenuItemsProps extends BaseAttackContextMenuItemsProps {
  attacksForWorkflowRun: BaseAttackProps[];
}

export const useAttackRunWorkflowContextMenuItems = ({
  attacksForWorkflowRun,
  closePopover,
}: UseAttackRunWorkflowContextMenuItemsProps): BulkAttackContextMenuItems => {
  const spaceId = useSpaceId() ?? 'default';
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const workflowUIEnabled = useWorkflowsUIEnabledSetting();
  const { hasIndexWrite, hasAttackIndexWrite, loading } = useAttacksPrivileges();

  const canRunWorkflow = useMemo(
    () =>
      !loading &&
      hasIndexWrite &&
      hasAttackIndexWrite &&
      workflowUIEnabled &&
      canExecuteWorkflow &&
      attacksForWorkflowRun.length > 0,
    [
      loading,
      hasIndexWrite,
      hasAttackIndexWrite,
      workflowUIEnabled,
      canExecuteWorkflow,
      attacksForWorkflowRun.length,
    ]
  );

  const attackDiscoveryIndexName = useMemo(
    () => `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`,
    [spaceId]
  );
  const attackAlertIds = useMemo(
    () =>
      attacksForWorkflowRun.map(({ attackId: _id }) => ({ _id, _index: attackDiscoveryIndexName })),
    [attacksForWorkflowRun, attackDiscoveryIndexName]
  );

  const handleClose = useCallback(() => closePopover?.(), [closePopover]);

  const items = useMemo(
    () =>
      canRunWorkflow
        ? [
            {
              key: 'run-attack-workflow-action',
              name: alertsTableI18n.CONTEXT_MENU_RUN_WORKFLOW,
              panel: RUN_WORKFLOW_BULK_PANEL_ID,
              'data-test-subj': 'run-attack-workflow-action',
            },
          ]
        : [],
    [canRunWorkflow]
  );

  const panels = useMemo(
    () =>
      canRunWorkflow
        ? [
            {
              id: RUN_WORKFLOW_BULK_PANEL_ID,
              title: alertsTableI18n.SELECT_WORKFLOW_PANEL_TITLE,
              'data-test-subj': 'attack-workflow-context-menu-panel',
              content: (
                <AlertWorkflowsPanel
                  alertIds={attackAlertIds}
                  onClose={handleClose}
                />
              ),
            },
          ]
        : [],
    [canRunWorkflow, attackAlertIds, handleClose]
  );

  return useMemo(() => ({ items, panels }), [items, panels]);
};
