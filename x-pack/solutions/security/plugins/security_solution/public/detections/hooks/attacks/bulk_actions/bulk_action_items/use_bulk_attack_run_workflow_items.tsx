/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';
import { useWorkflowsCapabilities, useWorkflowsUIEnabledSetting } from '@kbn/workflows-ui';
import type { RenderContentPanelProps } from '@kbn/response-ops-alerts-table/types';

import { useSpaceId } from '../../../../../common/hooks/use_space_id';
import * as alertsTableI18n from '../../../../components/alerts_table/translations';
import {
  AlertWorkflowsPanel,
  RUN_WORKFLOW_BULK_PANEL_ID,
} from '../../../../components/alerts_table/timeline_actions/use_run_alert_workflow_panel';
import { useAttacksPrivileges } from '../use_attacks_privileges';
import type { AttackContentPanelConfig, BulkAttackActionItems } from '../types';

/**
 * Hook that provides bulk action items and panels for running workflows on attacks.
 */
export const useBulkAttackRunWorkflowItems = (): BulkAttackActionItems => {
  const spaceId = useSpaceId() ?? 'default';
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const workflowUIEnabled = useWorkflowsUIEnabledSetting();
  const { hasIndexWrite, hasAttackIndexWrite, loading } = useAttacksPrivileges();

  const canRunWorkflow = useMemo(
    () =>
      !loading && hasIndexWrite && hasAttackIndexWrite && workflowUIEnabled && canExecuteWorkflow,
    [loading, hasIndexWrite, hasAttackIndexWrite, workflowUIEnabled, canExecuteWorkflow]
  );

  const attackDiscoveryIndexName = useMemo(
    () => `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`,
    [spaceId]
  );

  const renderContent = useCallback(
    ({ alertItems, closePopoverMenu }: RenderContentPanelProps) => {
      const alertIds = alertItems.map(({ _id, ecs }) => ({
        _id,
        _index: ecs._index || attackDiscoveryIndexName,
      }));
      return <AlertWorkflowsPanel alertIds={alertIds} onClose={closePopoverMenu} />;
    },
    [attackDiscoveryIndexName]
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
