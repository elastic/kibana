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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows';
import React, { useCallback, useMemo } from 'react';
import * as i18n from '../../components/alerts_table/translations';
import { useAlertsPrivileges } from '../../containers/detection_engine/alerts/use_alerts_privileges';
import {
  AlertWorkflowsPanel,
  RUN_WORKFLOW_BULK_PANEL_ID,
} from '../../components/alerts_table/timeline_actions/use_run_alert_workflow_panel';

export const useBulkRunAlertWorkflowPanel = (): {
  runWorkflowItems: BulkActionsConfig[];
  runWorkflowPanels: ContentPanelConfig[];
} => {
  const {
    services: { uiSettings, application },
  } = useKibana<{ application: ApplicationStart }>();

  const workflowUIEnabled = uiSettings?.get<boolean>(WORKFLOWS_UI_SETTING_ID, false) ?? false;
  const canExecuteWorkflow = application.capabilities.workflowsManagement?.executeWorkflow ?? false;
  const { hasIndexWrite } = useAlertsPrivileges();

  const renderContent = useCallback((props: RenderContentPanelProps) => {
    const alertIds = props.alertItems.map((item) => ({
      _id: item._id,
      _index: item._index ?? '',
    }));
    return <AlertWorkflowsPanel alertIds={alertIds} onClose={props.closePopoverMenu} />;
  }, []);

  const runWorkflowItems = useMemo(
    () =>
      hasIndexWrite && workflowUIEnabled && canExecuteWorkflow
        ? [
            {
              key: 'bulk-run-alert-workflow',
              'data-test-subj': 'bulk-run-alert-workflow-action',
              label: i18n.CONTEXT_MENU_RUN_WORKFLOW,
              name: i18n.CONTEXT_MENU_RUN_WORKFLOW,
              panel: RUN_WORKFLOW_BULK_PANEL_ID,
              disableOnQuery: false,
            },
          ]
        : [],
    [hasIndexWrite, workflowUIEnabled, canExecuteWorkflow]
  );

  const runWorkflowPanels = useMemo(
    () =>
      hasIndexWrite && workflowUIEnabled && canExecuteWorkflow
        ? [
            {
              id: RUN_WORKFLOW_BULK_PANEL_ID,
              title: i18n.SELECT_WORKFLOW_PANEL_TITLE,
              'data-test-subj': 'bulk-alert-workflow-context-menu-panel',
              renderContent,
            },
          ]
        : [],
    [hasIndexWrite, workflowUIEnabled, canExecuteWorkflow, renderContent]
  );

  return { runWorkflowItems, runWorkflowPanels };
};
