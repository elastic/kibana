/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BulkActionsConfig,
  ContentPanelConfig,
  RenderContentPanelProps,
} from '@kbn/response-ops-alerts-table/types';
import type { Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { useWorkflowsCapabilities, useWorkflowsUIEnabledSetting } from '@kbn/workflows-ui';
import React, { useCallback, useMemo } from 'react';
import * as i18n from '../../components/alerts_table/translations';
import { buildTimeRangeFilter } from '../../components/alerts_table/helpers';
import { useAlertsPrivileges } from '../../containers/detection_engine/alerts/use_alerts_privileges';
import {
  RUN_WORKFLOWS_PANEL_WIDTH,
  AlertWorkflowsPanel,
  RUN_WORKFLOW_BULK_PANEL_ID,
} from '../../components/alerts_table/timeline_actions/use_run_alert_workflow_panel';

export interface UseBulkRunAlertWorkflowPanelArgs {
  /** Start of the active time range, used to build the "select all" query. */
  from: string;
  /** End of the active time range, used to build the "select all" query. */
  to: string;
  /** Alerts table filters, used to build the "select all" query. */
  filters: Filter[];
  /** Alerts index to expand the "select all" query against on the server. */
  index?: string | null;
  /** Rule type ids, carried for context alongside a "select all" query selection. */
  ruleTypeIds?: string[];
}

export interface UseBulkRunAlertWorkflowPanelResult {
  runWorkflowItems: BulkActionsConfig[];
  runWorkflowPanels: ContentPanelConfig[];
}

export const BULK_RUN_ALERT_WORKFLOW_ACTION_ID = 'bulk-run-alert-workflow';

export const useBulkRunAlertWorkflowPanel = ({
  from,
  to,
  filters,
  index,
  ruleTypeIds,
}: UseBulkRunAlertWorkflowPanelArgs): UseBulkRunAlertWorkflowPanelResult => {
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const workflowUIEnabled = useWorkflowsUIEnabledSetting();
  const { hasIndexWrite } = useAlertsPrivileges();
  const canRunWorkflow = useMemo(
    () => hasIndexWrite && workflowUIEnabled && canExecuteWorkflow,
    [hasIndexWrite, workflowUIEnabled, canExecuteWorkflow]
  );

  const renderContent = useCallback(
    (props: RenderContentPanelProps) => {
      // On "select all", send a query so the whole selection is expanded server-side,
      // rather than only the alerts loaded on the current page.
      if (props.isAllSelected && index) {
        const timeFilter = buildTimeRangeFilter(from, to);
        const query = buildEsQuery(undefined, [], [...timeFilter, ...filters], undefined);
        return (
          <AlertWorkflowsPanel
            querySelection={{ query, index }}
            ruleTypeIds={ruleTypeIds}
            onClose={props.closePopoverMenu}
          />
        );
      }

      const alertIds = props.alertItems.map((item) => ({
        _id: item._id,
        _index: item._index ?? '',
      }));
      return <AlertWorkflowsPanel alertIds={alertIds} onClose={props.closePopoverMenu} />;
    },
    [from, to, filters, index, ruleTypeIds]
  );

  const runWorkflowItems = useMemo<BulkActionsConfig[]>(
    () =>
      canRunWorkflow
        ? [
            {
              key: BULK_RUN_ALERT_WORKFLOW_ACTION_ID,
              'data-test-subj': 'bulk-run-alert-workflow-action',
              label: i18n.CONTEXT_MENU_RUN_WORKFLOW,
              name: i18n.CONTEXT_MENU_RUN_WORKFLOW,
              panel: RUN_WORKFLOW_BULK_PANEL_ID,
              disableOnQuery: false,
              icon: 'workflow' as const,
              groupId: 'workflow' as const,
            },
          ]
        : [],
    [canRunWorkflow]
  );

  const runWorkflowPanels = useMemo(
    () =>
      canRunWorkflow
        ? [
            {
              id: RUN_WORKFLOW_BULK_PANEL_ID,
              title: i18n.SELECT_WORKFLOW_PANEL_TITLE,
              'data-test-subj': 'bulk-alert-workflow-context-menu-panel',
              width: RUN_WORKFLOWS_PANEL_WIDTH,
              renderContent,
            },
          ]
        : [],
    [canRunWorkflow, renderContent]
  );

  return useMemo(
    () => ({
      runWorkflowItems,
      runWorkflowPanels,
    }),
    [runWorkflowItems, runWorkflowPanels]
  );
};
