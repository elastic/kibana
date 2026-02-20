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
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import * as i18n from '../../components/alerts_table/translations';
import { useAlertsPrivileges } from '../../containers/detection_engine/alerts/use_alerts_privileges';
import {
  AlertWorkflowsPanel,
  RUN_WORKFLOW_BULK_PANEL_ID,
} from '../../components/alerts_table/timeline_actions/use_run_alert_workflow_panel';

export interface UseBulkRunAlertWorkflowPanelResult {
  runWorkflowItems: BulkActionsConfig[];
  runWorkflowPanels: ContentPanelConfig[];
}

export const useBulkRunAlertWorkflowPanel = (): UseBulkRunAlertWorkflowPanelResult => {
  const {
    services: { uiSettings, application },
  } = useKibana<{ application: ApplicationStart; uiSettings: IUiSettingsClient }>();

  const workflowUIEnabled = uiSettings?.get<boolean>(WORKFLOWS_UI_SETTING_ID, false) ?? false;
  const canExecuteWorkflow = application.capabilities.workflowsManagement?.executeWorkflow ?? false;
  const { hasIndexWrite } = useAlertsPrivileges();
  const canRunWorkflow = useMemo(
    () => hasIndexWrite && workflowUIEnabled && canExecuteWorkflow,
    [hasIndexWrite, workflowUIEnabled, canExecuteWorkflow]
  );

  const renderContent = useCallback((props: RenderContentPanelProps) => {
    const alertIds = props.alertItems.map((item) => ({
      _id: item._id,
      _index: item._index ?? '',
    }));
    return <AlertWorkflowsPanel alertIds={alertIds} onClose={props.closePopoverMenu} />;
  }, []);

  const runWorkflowItems = useMemo(
    () =>
      canRunWorkflow
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
