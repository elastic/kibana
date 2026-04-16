/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregateQuery } from '@kbn/es-query';
import type { FilterManager } from '@kbn/data-plugin/public';
import { EuiFormRow, EuiSpacer } from '@elastic/eui';
import { ESQLLangEditor, type DataErrorsControl } from '@kbn/esql/public';
import React, { useCallback, useMemo, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';

import { AlertSelectionFields } from '../../../alert_selection/alert_selection_fields';
import { AlertPreviewTabs } from '../../../alert_selection/alert_preview_tabs';
import * as alert_selection_i18n from '../../../alert_selection/translations';
import { useMatchedAlertsCount } from '../../../alert_selection/hooks/use_matched_alerts_count';
import { useKibana } from '../../../../../../common/lib/kibana';
import { AttackDiscoveryEventTypes } from '../../../../../../common/lib/telemetry';
import {
  DefaultAlertRetrievalAccordion,
  QueryModeSelector,
  WorkflowConfigurationPanel,
} from '../../../workflow_configuration';
import type { QueryMode } from '../../../workflow_configuration';
import { EditWithAi } from '../../../workflow_configuration/edit_with_ai';
import { ESQL } from '../../../workflow_configuration/translations';
import type { AlertsSelectionSettings } from '../../../types';
import type { WorkflowConfiguration } from '../../../workflow_configuration/types';
import type { UseFetchDefaultEsqlQueryResult } from '../../../workflow_configuration/hooks/use_fetch_default_esql_query';

export const DEBOUNCE_MS = 300;

export interface AlertRetrievalContentProps {
  alertRetrievalHasError: boolean;
  alertsPreviewStackBy0: string;
  alertSummaryStackBy0: string;
  connectorId: string | undefined;
  fetchDefaultEsqlQueryResult: UseFetchDefaultEsqlQueryResult;
  filterManager: FilterManager;
  onConnectorIdSelected: (connectorId: string) => void;
  onSettingsChanged?: (settings: AlertsSelectionSettings) => void;
  onWorkflowConfigurationChange: (config: WorkflowConfiguration) => void;
  setAlertsPreviewStackBy0: React.Dispatch<React.SetStateAction<string>>;
  setAlertSummaryStackBy0: React.Dispatch<React.SetStateAction<string>>;
  settings: AlertsSelectionSettings;
  workflowConfiguration: WorkflowConfiguration;
}

const AlertRetrievalContentComponent: React.FC<AlertRetrievalContentProps> = ({
  alertRetrievalHasError,
  alertsPreviewStackBy0,
  alertSummaryStackBy0,
  connectorId,
  fetchDefaultEsqlQueryResult,
  filterManager,
  onConnectorIdSelected,
  onSettingsChanged,
  onWorkflowConfigurationChange,
  setAlertsPreviewStackBy0,
  setAlertSummaryStackBy0,
  settings,
  workflowConfiguration,
}) => {
  const { telemetry } = useKibana().services;
  const [isDataErrorsEnabled, setIsDataErrorsEnabled] = useState(false);
  const dataErrorsControl = useMemo<DataErrorsControl>(
    () => ({ enabled: isDataErrorsEnabled, onChange: setIsDataErrorsEnabled }),
    [isDataErrorsEnabled]
  );

  const [debouncedEsqlQuery, setDebouncedEsqlQuery] = useState(workflowConfiguration.esqlQuery);

  useDebounce(
    () => {
      setDebouncedEsqlQuery(workflowConfiguration.esqlQuery);
    },
    DEBOUNCE_MS,
    [workflowConfiguration.esqlQuery]
  );

  const handleDefaultToggle = useCallback(
    (enabled: boolean) => {
      const newMode = enabled ? 'custom_query' : 'custom_only';

      telemetry.reportEvent(AttackDiscoveryEventTypes.AlertRetrievalModeChanged, {
        mode: newMode,
      });

      onWorkflowConfigurationChange({
        ...workflowConfiguration,
        alertRetrievalMode: newMode,
      });
    },
    [onWorkflowConfigurationChange, telemetry, workflowConfiguration]
  );

  const handleQueryModeChange = useCallback(
    async (mode: QueryMode) => {
      telemetry.reportEvent(AttackDiscoveryEventTypes.QueryModeChanged, { mode });

      if (mode === 'esql' && workflowConfiguration.esqlQuery == null) {
        const defaultQuery = await fetchDefaultEsqlQueryResult.fetchDefaultEsqlQuery();

        onWorkflowConfigurationChange({
          ...workflowConfiguration,
          alertRetrievalMode: mode,
          ...(defaultQuery != null ? { esqlQuery: defaultQuery } : {}),
        });
      } else {
        onWorkflowConfigurationChange({
          ...workflowConfiguration,
          alertRetrievalMode: mode,
        });
      }
    },
    [fetchDefaultEsqlQueryResult, onWorkflowConfigurationChange, telemetry, workflowConfiguration]
  );

  const handleEsqlQueryChange = useCallback(
    (query: AggregateQuery) => {
      if ('esql' in query) {
        onWorkflowConfigurationChange({
          ...workflowConfiguration,
          esqlQuery: query.esql,
        });
      }
    },
    [onWorkflowConfigurationChange, workflowConfiguration]
  );

  const handleEsqlQuerySubmit = useCallback(
    async (query?: AggregateQuery) => {
      if (query != null) {
        handleEsqlQueryChange(query);
      }
    },
    [handleEsqlQueryChange]
  );

  const handleEsqlQueryChangeFromAi = useCallback(
    (query: string) => {
      onWorkflowConfigurationChange({
        ...workflowConfiguration,
        esqlQuery: query,
      });
    },
    [onWorkflowConfigurationChange, workflowConfiguration]
  );

  const esqlEditorQuery = useMemo(
    () => ({ esql: workflowConfiguration.esqlQuery ?? '' }),
    [workflowConfiguration.esqlQuery]
  );

  const queryMode: QueryMode =
    workflowConfiguration.alertRetrievalMode === 'esql' ? 'esql' : 'custom_query';

  const isDefaultEnabled = workflowConfiguration.alertRetrievalMode !== 'custom_only';

  const { count: matchedAlertsCount } = useMatchedAlertsCount({
    esqlQuery: queryMode === 'esql' ? debouncedEsqlQuery : undefined,
    settings,
    skip: !isDefaultEnabled,
  });

  return (
    <>
      <DefaultAlertRetrievalAccordion isEnabled={isDefaultEnabled} onToggle={handleDefaultToggle}>
        <QueryModeSelector mode={queryMode} onModeChange={handleQueryModeChange} />

        <EuiSpacer size="m" />

        {queryMode === 'custom_query' && (
          <>
            <AlertSelectionFields
              connectorId={connectorId}
              filterManager={filterManager}
              onConnectorIdSelected={onConnectorIdSelected}
              onSettingsChanged={onSettingsChanged}
              settings={settings}
              showConnectorSelector={false}
            />

            <EuiSpacer size="l" />

            <AlertPreviewTabs
              alertsCount={matchedAlertsCount}
              alertsPreviewStackBy0={alertsPreviewStackBy0}
              alertsPreviewTabLabel={alert_selection_i18n.ALERTS_LIST}
              alertSummaryStackBy0={alertSummaryStackBy0}
              setAlertsPreviewStackBy0={setAlertsPreviewStackBy0}
              setAlertSummaryStackBy0={setAlertSummaryStackBy0}
              settings={settings}
            />
          </>
        )}

        {queryMode === 'esql' && (
          <>
            <EuiFormRow fullWidth label={ESQL}>
              <div data-test-subj="esqlQueryEditor">
                <ESQLLangEditor
                  dataErrorsControl={dataErrorsControl}
                  disableSubmitAction
                  editorIsInline
                  expandToFitQueryOnMount
                  hasOutline
                  hideQueryHistory
                  hideRunQueryButton
                  isLoading={fetchDefaultEsqlQueryResult.isLoading}
                  onTextLangQueryChange={handleEsqlQueryChange}
                  onTextLangQuerySubmit={handleEsqlQuerySubmit}
                  query={esqlEditorQuery}
                />
              </div>
            </EuiFormRow>

            <EditWithAi
              esqlQuery={workflowConfiguration.esqlQuery ?? ''}
              onEsqlQueryChange={handleEsqlQueryChangeFromAi}
            />

            <EuiSpacer size="l" />

            <AlertPreviewTabs
              alertsCount={matchedAlertsCount}
              alertsPreviewStackBy0={alertsPreviewStackBy0}
              alertsPreviewTabLabel={alert_selection_i18n.ALERTS_LIST}
              alertSummaryStackBy0={alertSummaryStackBy0}
              esqlQuery={debouncedEsqlQuery}
              setAlertsPreviewStackBy0={setAlertsPreviewStackBy0}
              setAlertSummaryStackBy0={setAlertSummaryStackBy0}
              settings={settings}
            />
          </>
        )}
      </DefaultAlertRetrievalAccordion>

      <EuiSpacer size="m" />

      <WorkflowConfigurationPanel
        connectorId={connectorId}
        isInvalid={alertRetrievalHasError}
        onChange={onWorkflowConfigurationChange}
        value={workflowConfiguration}
      />
    </>
  );
};

AlertRetrievalContentComponent.displayName = 'AlertRetrievalContent';

export const AlertRetrievalContent = React.memo(AlertRetrievalContentComponent);
