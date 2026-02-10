/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiButton, EuiPanel, EuiFlexGroup } from '@elastic/eui';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { WorkflowSelector } from '@kbn/workflows-ui/src/components';
import { useWorkflowActions } from '@kbn/workflows-management-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { RunWorkflowResponseDto, WorkflowListDto } from '@kbn/workflows';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import type { AlertTriggerInput } from '@kbn/workflows-management-plugin/common/types/alert_types';
import { Loader } from '../../../../common/components/loader';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { AlertTableContextMenuItem } from '../types';
import { useAlertsPrivileges } from '../../../containers/detection_engine/alerts/use_alerts_privileges';
import * as i18n from '../translations';

export interface UseAlertTagsActionsProps {
  closePopover: () => void;
  ecsRowData: Ecs;
}

export const RUN_WORKFLOW_PANEL_ID = 'RUN_WORKFLOW_PANEL_ID';
export const RUN_WORKFLOW_BULK_PANEL_ID = 'BULK_RUN_WORKFLOW_PANEL_ID';

export interface AlertWorkflowAlertId {
  _id: string;
  _index: string;
}

export interface AlertWorkflowsPanelProps {
  alertIds: AlertWorkflowAlertId[];
  onClose: () => void;
}

export const AlertWorkflowsPanel = ({ alertIds, onClose }: AlertWorkflowsPanelProps) => {
  const {
    services: { application, rendering },
  } = useKibana<{ application: ApplicationStart }>();
  const { addSuccess: workflowTriggerSuccess, addError: workflowTriggerFailed } = useAppToasts();

  const { runWorkflow } = useWorkflowActions();
  const [selectedId, setSelectedId] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const handleExecuteClick = useCallback(() => {
    if (!selectedId) return;
    setIsLoading(true);

    const inputsPayload: AlertTriggerInput = {
      event: {
        triggerType: 'alert',
        alertIds,
      },
    };

    runWorkflow.mutate(
      {
        id: selectedId,
        inputs: { ...inputsPayload },
      },
      {
        onSuccess: (data: RunWorkflowResponseDto) => {
          workflowTriggerSuccess({
            title: i18n.WORKFLOW_START_SUCCESS_TOAST,
            ...(rendering && {
              text: toMountPoint(
                <EuiFlexGroup justifyContent={'flexEnd'}>
                  <EuiButton
                    size="s"
                    onClick={() => {
                      application.navigateToApp(WORKFLOWS_APP_ID, {
                        openInNewTab: true,
                        path: `${selectedId}?executionId=${data.workflowExecutionId}`,
                      });
                    }}
                  >
                    {i18n.WORKFLOW_START_SUCCESS_BUTTON}
                  </EuiButton>
                </EuiFlexGroup>,
                rendering
              ),
            }),
          });
        },
        onError: (err) => {
          workflowTriggerFailed(err, {
            title: i18n.WORKFLOW_START_FAILED_TOAST,
          });
        },
        onSettled: () => {
          setIsLoading(false);
          onClose();
        },
      }
    );
  }, [
    application,
    selectedId,
    runWorkflow,
    workflowTriggerSuccess,
    workflowTriggerFailed,
    rendering,
    onClose,
    alertIds,
  ]);

  const isAlertWorkflow = (workflows: WorkflowListDto['results']): WorkflowListDto['results'] => {
    return workflows.filter((workflow) => {
      return workflow.definition?.triggers.some((trigger) => {
        return trigger.type === 'alert';
      });
    });
  };

  return (
    <>
      <EuiPanel>
        {isLoading && (
          <Loader>
            <WorkflowSelector
              selectedWorkflowId={selectedId || undefined}
              onWorkflowChange={setSelectedId}
              config={{ filterFunction: isAlertWorkflow }}
            />
          </Loader>
        )}
        {!isLoading && (
          <WorkflowSelector
            selectedWorkflowId={selectedId || undefined}
            onWorkflowChange={setSelectedId}
            config={{ filterFunction: isAlertWorkflow }}
          />
        )}
      </EuiPanel>
      <EuiButton
        data-test-subj="execute-alert-workflow-button"
        fullWidth
        size="s"
        onClick={handleExecuteClick}
        disabled={!selectedId || isLoading}
      >
        {i18n.RUN_WORKFLOW_BUTTON}
      </EuiButton>
    </>
  );
};

export const useRunAlertWorkflowPanel = ({
  closePopover,
  ecsRowData,
}: UseAlertTagsActionsProps) => {
  const {
    services: { uiSettings, application },
  } = useKibana<{ application: ApplicationStart }>();

  const workflowUIEnabled = uiSettings?.get<boolean>(WORKFLOWS_UI_SETTING_ID, false) ?? false;
  const canExecuteWorkflow = application.capabilities.workflowsManagement?.executeWorkflow ?? false;
  const { hasIndexWrite } = useAlertsPrivileges();

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

  return {
    runWorkflowMenuItem:
      hasIndexWrite && workflowUIEnabled && canExecuteWorkflow ? runWorkflowMenuItem : [],
    runAlertWorkflowPanel:
      hasIndexWrite && workflowUIEnabled && canExecuteWorkflow ? runAlertWorkflowPanel : [],
  };
};
