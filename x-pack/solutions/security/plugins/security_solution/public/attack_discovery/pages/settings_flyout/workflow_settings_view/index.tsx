/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterManager } from '@kbn/data-plugin/public';
import React, { useCallback, useMemo } from 'react';

import { AlertRetrievalStep } from './alert_retrieval_step';
import { GenerationStep, ValidationStep, WorkflowSettingsViewLayout } from './components';
import { ConnectorField } from '../alert_selection/connector_field';
import { ValidationPanel } from '../workflow_configuration';
import * as workflowI18n from '../workflow_configuration/translations';
import type { AlertsSelectionSettings, ValidationItem } from '../types';
import type { WorkflowConfiguration } from '../workflow_configuration/types';
import type { UseFetchDefaultEsqlQueryResult } from '../workflow_configuration/hooks/use_fetch_default_esql_query';

export interface WorkflowSettingsViewProps {
  alertRetrievalHasError: boolean;
  alertsPreviewStackBy0: string;
  alertSummaryStackBy0: string;
  connectorId: string | undefined;
  fetchDefaultEsqlQueryResult: UseFetchDefaultEsqlQueryResult;
  filterManager: FilterManager;
  onConnectorIdSelected: (connectorId: string) => void;
  onSettingsChanged?: (settings: AlertsSelectionSettings) => void;
  onWorkflowConfigurationChange: (config: WorkflowConfiguration) => void;
  validationHasError: boolean;
  setAlertsPreviewStackBy0: React.Dispatch<React.SetStateAction<string>>;
  setAlertSummaryStackBy0: React.Dispatch<React.SetStateAction<string>>;
  settings: AlertsSelectionSettings;
  showConnectorSelector: boolean;
  workflowConfiguration: WorkflowConfiguration;
  workflowValidationItems: readonly ValidationItem[];
}

const WorkflowSettingsViewComponent: React.FC<WorkflowSettingsViewProps> = ({
  alertRetrievalHasError,
  alertsPreviewStackBy0,
  alertSummaryStackBy0,
  connectorId,
  fetchDefaultEsqlQueryResult,
  filterManager,
  onConnectorIdSelected,
  onSettingsChanged,
  onWorkflowConfigurationChange,
  validationHasError,
  setAlertsPreviewStackBy0,
  setAlertSummaryStackBy0,
  settings,
  showConnectorSelector,
  workflowConfiguration,
  workflowValidationItems,
}) => {
  const handleValidationWorkflowChange = useCallback(
    (validationWorkflowId: string) => {
      onWorkflowConfigurationChange({
        ...workflowConfiguration,
        validationWorkflowId,
      });
    },
    [onWorkflowConfigurationChange, workflowConfiguration]
  );

  const steps = useMemo(
    () => [
      {
        title: workflowI18n.ALERT_RETRIEVAL_SECTION_TITLE,
        ...(alertRetrievalHasError ? { status: 'danger' as const } : {}),
        children: (
          <AlertRetrievalStep
            alertRetrievalHasError={alertRetrievalHasError}
            alertsPreviewStackBy0={alertsPreviewStackBy0}
            alertSummaryStackBy0={alertSummaryStackBy0}
            connectorId={connectorId}
            fetchDefaultEsqlQueryResult={fetchDefaultEsqlQueryResult}
            filterManager={filterManager}
            onConnectorIdSelected={onConnectorIdSelected}
            onSettingsChanged={onSettingsChanged}
            onWorkflowConfigurationChange={onWorkflowConfigurationChange}
            setAlertsPreviewStackBy0={setAlertsPreviewStackBy0}
            setAlertSummaryStackBy0={setAlertSummaryStackBy0}
            settings={settings}
            workflowConfiguration={workflowConfiguration}
          />
        ),
      },
      {
        title: workflowI18n.GENERATION_SECTION_TITLE,
        children: (
          <GenerationStep
            connectorSelector={
              showConnectorSelector ? (
                <ConnectorField
                  connectorId={connectorId}
                  onConnectorIdSelected={onConnectorIdSelected}
                  showDescription={false}
                />
              ) : undefined
            }
          />
        ),
      },
      {
        title: workflowI18n.VALIDATION_SECTION_TITLE,
        ...(validationHasError ? { status: 'danger' as const } : {}),
        children: (
          <ValidationStep
            validationPanel={
              <ValidationPanel
                isInvalid={validationHasError}
                onChange={handleValidationWorkflowChange}
                value={workflowConfiguration.validationWorkflowId}
              />
            }
          />
        ),
      },
    ],
    [
      alertRetrievalHasError,
      alertsPreviewStackBy0,
      alertSummaryStackBy0,
      connectorId,
      fetchDefaultEsqlQueryResult,
      filterManager,
      handleValidationWorkflowChange,
      onConnectorIdSelected,
      onSettingsChanged,
      onWorkflowConfigurationChange,
      setAlertsPreviewStackBy0,
      setAlertSummaryStackBy0,
      settings,
      showConnectorSelector,
      validationHasError,
      workflowConfiguration,
    ]
  );

  return (
    <WorkflowSettingsViewLayout steps={steps} workflowValidationItems={workflowValidationItems} />
  );
};

WorkflowSettingsViewComponent.displayName = 'WorkflowSettingsView';

export const WorkflowSettingsView = React.memo(WorkflowSettingsViewComponent);
