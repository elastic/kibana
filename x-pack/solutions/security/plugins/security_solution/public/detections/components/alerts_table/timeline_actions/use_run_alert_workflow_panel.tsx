/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useWorkflowsCapabilities, useWorkflowsUIEnabledSetting } from '@kbn/workflows-ui';
import type { AlertTableContextMenuItem } from '../types';
import { useAlertsPrivileges } from '../../../containers/detection_engine/alerts/use_alerts_privileges';
import * as i18n from '../translations';
import { RunWorkflowPanel } from './run_workflow_panel';

export interface AlertWorkflowsPanelProps {
  /** Array of alert ids and their respective indices */
  alertIds: {
    _id: string;
    _index: string;
  }[];
  onClose: () => void;
  /** Optional callback invoked when workflow execution is triggered. */
  onExecute?: () => void;
}

/** A panel that lets users select and execute a workflow against one or more alerts. **/
export const AlertWorkflowsPanel = ({ alertIds, onClose, onExecute }: AlertWorkflowsPanelProps) => {
  const inputs = useMemo(
    () => ({
      event: {
        triggerType: 'alert' as const,
        alertIds,
      },
    }),
    [alertIds]
  );

  return (
    <RunWorkflowPanel
      inputs={inputs}
      sortTriggerType="alert"
      executeButtonTestSubj="execute-alert-workflow-button"
      onClose={onClose}
      onExecute={onExecute}
    />
  );
};

export const RUN_WORKFLOW_PANEL_ID = 'RUN_WORKFLOW_PANEL_ID';
export const RUN_WORKFLOW_BULK_PANEL_ID = 'BULK_RUN_WORKFLOW_PANEL_ID';
export const RUN_WORKFLOWS_PANEL_WIDTH = 400;

export interface UseRunAlertWorkflowPanelProps {
  /** ECS document for the selected alert row. */
  ecsRowData: Ecs;
  closePopover: () => void;
}

export interface UseRunAlertWorkflowPanelResult {
  /** Context menu action that opens the run workflow panel. */
  runWorkflowMenuItem: AlertTableContextMenuItem[];
  /** Context menu panel descriptor used to render the workflow selector. */
  runAlertWorkflowPanel: EuiContextMenuPanelDescriptor[];
}

export const useRunAlertWorkflowPanel = ({
  closePopover,
  ecsRowData,
}: UseRunAlertWorkflowPanelProps): UseRunAlertWorkflowPanelResult => {
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const workflowUIEnabled = useWorkflowsUIEnabledSetting();
  const { hasIndexWrite } = useAlertsPrivileges();
  const canRunWorkflow = useMemo(
    () => hasIndexWrite && workflowUIEnabled && canExecuteWorkflow,
    [hasIndexWrite, workflowUIEnabled, canExecuteWorkflow]
  );

  const runWorkflowMenuItem: AlertTableContextMenuItem[] = useMemo(
    () => [
      {
        'aria-label': i18n.CONTEXT_MENU_RUN_WORKFLOW,
        'data-test-subj': 'run-workflow-action',
        key: 'run-workflow-action',
        size: 's',
        name: i18n.CONTEXT_MENU_RUN_WORKFLOW,
        panel: RUN_WORKFLOW_PANEL_ID,
      },
    ],
    []
  );

  const runAlertWorkflowPanel: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: RUN_WORKFLOW_PANEL_ID,
        title: i18n.SELECT_WORKFLOW_PANEL_TITLE,
        'data-test-subj': 'alert-workflow-context-menu-panel',
        width: RUN_WORKFLOWS_PANEL_WIDTH,
        content: (
          <AlertWorkflowsPanel
            alertIds={[{ _id: ecsRowData._id, _index: ecsRowData._index ?? '' }]}
            onClose={closePopover}
          />
        ),
      },
    ],
    [closePopover, ecsRowData]
  );

  return useMemo(
    () => ({
      runWorkflowMenuItem: canRunWorkflow ? runWorkflowMenuItem : [],
      runAlertWorkflowPanel: canRunWorkflow ? runAlertWorkflowPanel : [],
    }),
    [canRunWorkflow, runWorkflowMenuItem, runAlertWorkflowPanel]
  );
};
