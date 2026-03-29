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
  AlertWorkflowsPanel,
  RUN_WORKFLOW_BULK_PANEL_ID,
} from '../../../../components/alerts_table/timeline_actions/use_run_alert_workflow_panel';
import { useAttacksPrivileges } from '../use_attacks_privileges';
import type { AttackContentPanelConfig, BulkAttackActionItems } from '../types';
import { useKibana } from '../../../../../common/lib/kibana';
import type { AttacksActionTelemetrySource } from '../../../../../common/lib/telemetry';
import { AttacksEventTypes } from '../../../../../common/lib/telemetry';

export interface UseBulkAttackRunWorkflowItemsProps {
  /** Source of the action for telemetry */
  telemetrySource?: AttacksActionTelemetrySource;
}

/**
 * Hook that provides bulk action items and panels for running workflows on attacks.
 */
export const useBulkAttackRunWorkflowItems = ({
  telemetrySource,
}: UseBulkAttackRunWorkflowItemsProps = {}): BulkAttackActionItems => {
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const workflowUIEnabled = useWorkflowsUIEnabledSetting();
  const { hasIndexWrite, hasAttackIndexWrite, loading } = useAttacksPrivileges();
  const {
    services: { telemetry },
  } = useKibana();

  const canRunWorkflow = useMemo(
    () =>
      !loading && hasIndexWrite && hasAttackIndexWrite && workflowUIEnabled && canExecuteWorkflow,
    [loading, hasIndexWrite, hasAttackIndexWrite, workflowUIEnabled, canExecuteWorkflow]
  );

  const handleExecute = useCallback(() => {
    if (telemetrySource) {
      telemetry?.reportEvent(AttacksEventTypes.WorkflowRunTriggered, { source: telemetrySource });
    }
  }, [telemetry, telemetrySource]);

  const renderContent = useCallback(
    ({ alertItems, closePopoverMenu }: RenderContentPanelProps) => {
      const alertIds = alertItems.flatMap(({ _id, ecs }) =>
        ecs._index ? [{ _id, _index: ecs._index }] : []
      );
      return (
        <AlertWorkflowsPanel
          alertIds={alertIds}
          onClose={closePopoverMenu}
          onExecute={handleExecute}
        />
      );
    },
    [handleExecute]
  );

  const items = useMemo(
    () =>
      canRunWorkflow
        ? [
            {
              key: 'run-attack-workflow-action',
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
              renderContent,
            },
          ]
        : [],
    [canRunWorkflow, renderContent]
  );

  return useMemo(() => ({ items, panels }), [items, panels]);
};
