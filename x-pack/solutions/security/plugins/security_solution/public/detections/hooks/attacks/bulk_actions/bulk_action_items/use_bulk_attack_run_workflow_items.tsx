/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useWorkflowsCapabilities, useWorkflowsUIEnabledSetting } from '@kbn/workflows-ui';
import type { RenderContentPanelProps } from '@kbn/response-ops-alerts-table/types';

import * as alertsTableI18n from '../../../../components/alerts_table/translations';
import {
  RUN_WORKFLOWS_PANEL_WIDTH,
  AlertWorkflowsPanel,
  RUN_WORKFLOW_BULK_PANEL_ID,
} from '../../../../components/alerts_table/timeline_actions/use_run_alert_workflow_panel';
import { useAttacksPrivileges } from '../use_attacks_privileges';
import type { AttackContentPanelConfig, BulkAttackActionItems } from '../types';
import { RUN_ATTACK_WORKFLOW_ACTION_ID } from '../../../../../common/constants/action_ids';

/**
 * Hook that provides bulk action items and panels for running workflows on attacks.
 */
export const useBulkAttackRunWorkflowItems = (): BulkAttackActionItems => {
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const workflowUIEnabled = useWorkflowsUIEnabledSetting();
  const { hasIndexWrite, hasAttackIndexWrite, loading } = useAttacksPrivileges();

  const canRunWorkflow = useMemo(
    () =>
      !loading && hasIndexWrite && hasAttackIndexWrite && workflowUIEnabled && canExecuteWorkflow,
    [loading, hasIndexWrite, hasAttackIndexWrite, workflowUIEnabled, canExecuteWorkflow]
  );

  const renderContent = useCallback(({ alertItems, closePopoverMenu }: RenderContentPanelProps) => {
    const alertIds = alertItems.flatMap(({ _id, ecs }) =>
      ecs._index ? [{ _id, _index: ecs._index }] : []
    );
    return (
      <AlertWorkflowsPanel
        alertIds={alertIds}
        onClose={closePopoverMenu}
        telemetrySurface="attack"
        isBulk={alertIds.length > 1}
      />
    );
  }, []);

  const items = useMemo(
    () =>
      canRunWorkflow
        ? [
            {
              key: RUN_ATTACK_WORKFLOW_ACTION_ID,
              name: alertsTableI18n.CONTEXT_MENU_RUN_WORKFLOW,
              label: alertsTableI18n.CONTEXT_MENU_RUN_WORKFLOW,
              panel: RUN_WORKFLOW_BULK_PANEL_ID,
              'data-test-subj': 'run-attack-workflow-action',
              disableOnQuery: true as const,
            },
          ]
        : [],
    [canRunWorkflow]
  );

  const panels: AttackContentPanelConfig[] = useMemo(
    () =>
      canRunWorkflow
        ? [
            {
              id: RUN_WORKFLOW_BULK_PANEL_ID,
              title: alertsTableI18n.SELECT_WORKFLOW_PANEL_TITLE,
              'data-test-subj': 'attack-workflow-context-menu-panel',
              width: RUN_WORKFLOWS_PANEL_WIDTH,
              renderContent,
            },
          ]
        : [],
    [canRunWorkflow, renderContent]
  );

  return useMemo(() => ({ items, panels }), [items, panels]);
};
