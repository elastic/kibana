/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterManager } from '@kbn/data-plugin/public';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING } from '../../../../../common/constants';
import { DEFAULT_STACK_BY_FIELD } from '..';
import { AlertSelection } from '../alert_selection';
import { useKibana } from '../../../../common/lib/kibana';
import { AttackDiscoveryEventTypes } from '../../../../common/lib/telemetry';
import { convertToBuildEsQuery } from '../../../../common/lib/kuery';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { parseFilterQuery } from '../parse_filter_query';
import type { SettingsOverrideOptions } from '../../results/history/types';
import type { UseFetchDefaultEsqlQueryResult } from '../workflow_configuration';
import {
  hasAtLeastOneRetrievalToggle,
  hasEmptyRequiredRetrievalWorkflows,
  useFetchDefaultEsqlQuery,
  useWorkflowConfiguration,
} from '../workflow_configuration';
import { DEFAULT_WORKFLOW_CONFIGURATION } from '../workflow_configuration/constants';
import { WorkflowSettingsView } from '../workflow_settings_view';
import * as i18n from './translations';
import * as workflowI18n from '../workflow_configuration/translations';
import type { AlertsSelectionSettings, ValidationItem } from '../types';
import { useWorkflowHealthCheck } from './use_workflow_health_check';

export interface UseSettingsView {
  actionButtons: React.ReactNode;
  alertRetrievalHasError: boolean;
  alertsPreviewStackBy0: string;
  alertSummaryStackBy0: string;
  fetchDefaultEsqlQueryResult: UseFetchDefaultEsqlQueryResult;
  filterManager: FilterManager;
  setAlertsPreviewStackBy0: React.Dispatch<React.SetStateAction<string>>;
  setAlertSummaryStackBy0: React.Dispatch<React.SetStateAction<string>>;
  settingsView: React.ReactNode;
  validationHasError: boolean;
}

interface Props {
  connectorId: string | undefined;
  isWorkflowsEnabledOverride?: boolean;
  onConnectorIdSelected: (connectorId: string) => void;
  onGenerate?: (overrideOptions?: SettingsOverrideOptions) => Promise<void>;
  onSettingsChanged?: (settings: AlertsSelectionSettings) => void;
  onSettingsReset?: () => void;
  onSettingsSave?: () => void;
  settings: AlertsSelectionSettings;
  showConnectorSelector: boolean;
}

export const useSettingsView = ({
  connectorId,
  isWorkflowsEnabledOverride,
  onConnectorIdSelected,
  onGenerate,
  onSettingsReset,
  onSettingsSave,
  onSettingsChanged,
  settings,
  showConnectorSelector,
}: Props): UseSettingsView => {
  const { euiTheme } = useEuiTheme();
  const { featureFlags, telemetry, uiSettings } = useKibana().services;
  const filterManager = useRef<FilterManager>(new FilterManager(uiSettings));
  const { dataView } = useDataView();

  const [alertSummaryStackBy0, setAlertSummaryStackBy0] = useState<string>(DEFAULT_STACK_BY_FIELD);

  const [alertsPreviewStackBy0, setAlertsPreviewStackBy0] =
    useState<string>(DEFAULT_STACK_BY_FIELD);
  const [localConnectorId, setLocalConnectorId] = useState<string | undefined>(connectorId);

  // Feature flag and workflow configuration
  const [isWorkflowsEnabledFlag, setIsWorkflowsEnabledFlag] = useState<boolean>(false);
  const fetchDefaultEsqlQueryResult = useFetchDefaultEsqlQuery();
  const { resetCache: resetDefaultEsqlQueryCache } = fetchDefaultEsqlQueryResult;
  const {
    clearSettings: clearWorkflowSettings,
    updateSettings: persistWorkflowSettings,
    workflowConfiguration: persistedWorkflowConfiguration,
  } = useWorkflowConfiguration();

  // Draft state: workflow config changes are kept local until save is clicked.
  // On cancel (flyout unmount), the draft is discarded automatically.
  const [draftWorkflowConfiguration, setDraftWorkflowConfiguration] = useState(
    persistedWorkflowConfiguration
  );

  useEffect(() => {
    setDraftWorkflowConfiguration(persistedWorkflowConfiguration);
  }, [persistedWorkflowConfiguration]);

  const workflowConfiguration = draftWorkflowConfiguration;

  // Load feature flag value and combine with per-space uiSetting opt-in
  useEffect(() => {
    const loadFeatureFlag = async () => {
      const ffEnabled = await featureFlags.getBooleanValue(
        'securitySolution.attackDiscoveryWorkflowsEnabled',
        true
      );
      setIsWorkflowsEnabledFlag(
        ffEnabled && uiSettings.get(ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING, false)
      );
    };
    loadFeatureFlag();
  }, [featureFlags, uiSettings]);

  const isWorkflowsEnabled = isWorkflowsEnabledOverride ?? isWorkflowsEnabledFlag;

  // Sync local connector ID with prop changes
  useEffect(() => {
    setLocalConnectorId(connectorId);
  }, [connectorId]);

  const handleLocalConnectorIdChange = useCallback((newConnectorId: string) => {
    setLocalConnectorId(newConnectorId);
  }, []);

  const handleReset = useCallback(() => {
    telemetry.reportEvent(AttackDiscoveryEventTypes.SettingsReset, {});

    onSettingsReset?.();

    if (isWorkflowsEnabled) {
      clearWorkflowSettings();
      resetDefaultEsqlQueryCache();
      setDraftWorkflowConfiguration(DEFAULT_WORKFLOW_CONFIGURATION);
    }
  }, [
    clearWorkflowSettings,
    isWorkflowsEnabled,
    onSettingsReset,
    resetDefaultEsqlQueryCache,
    telemetry,
  ]);

  const handleWorkflowConfigurationChange = useCallback(
    (newConfig: typeof workflowConfiguration) => {
      setDraftWorkflowConfiguration(newConfig);
    },
    []
  );

  // Per-section validation: at least one of the three retrieval toggles must be enabled
  const alertRetrievalHasError = useMemo(() => {
    if (!isWorkflowsEnabled) {
      return false;
    }

    return !hasAtLeastOneRetrievalToggle(workflowConfiguration);
  }, [isWorkflowsEnabled, workflowConfiguration]);

  // Deferred validation: the alert retrieval workflows toggle is the sole enabled
  // retrieval source but no workflow is selected. Unlike `alertRetrievalHasError`,
  // this must NOT surface immediately (the toggle alone is a valid intermediate
  // state) and must NOT disable the action buttons; instead, a Save / Save and run
  // attempt is canceled and the error is revealed.
  const emptyRetrievalWorkflows = useMemo(
    () => isWorkflowsEnabled && hasEmptyRequiredRetrievalWorkflows(workflowConfiguration),
    [isWorkflowsEnabled, workflowConfiguration]
  );

  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);

  // Once the misconfiguration is resolved, reset the attempt flag so the error
  // only ever reappears after another Save / Save and run attempt.
  useEffect(() => {
    if (!emptyRetrievalWorkflows) {
      setHasAttemptedSave(false);
    }
  }, [emptyRetrievalWorkflows]);

  const showEmptyRetrievalWorkflowsError = hasAttemptedSave && emptyRetrievalWorkflows;

  const alertRetrievalSectionHasError = alertRetrievalHasError || showEmptyRetrievalWorkflowsError;

  // Per-section validation: no validation workflow selected
  const validationHasError = useMemo(() => {
    if (!isWorkflowsEnabled) {
      return false;
    }

    return !workflowConfiguration.validationWorkflowId;
  }, [isWorkflowsEnabled, workflowConfiguration.validationWorkflowId]);

  const healthCheckWarnings = useWorkflowHealthCheck({
    isWorkflowsEnabled,
    workflowConfiguration,
  });

  const workflowValidationItems: readonly ValidationItem[] = useMemo(() => {
    const errors: ValidationItem[] = [];

    if (alertRetrievalHasError) {
      errors.push({
        level: 'error',
        message: workflowI18n.NO_ALERT_RETRIEVAL_METHOD_SELECTED,
      });
    }

    if (showEmptyRetrievalWorkflowsError) {
      errors.push({
        level: 'error',
        message: workflowI18n.NO_ALERT_RETRIEVAL_WORKFLOWS_SELECTED,
      });
    }

    if (validationHasError) {
      errors.push({
        level: 'error',
        message: workflowI18n.NO_VALIDATION_WORKFLOW_SELECTED,
      });
    }

    return [...errors, ...healthCheckWarnings];
  }, [
    alertRetrievalHasError,
    healthCheckWarnings,
    showEmptyRetrievalWorkflowsError,
    validationHasError,
  ]);

  // The action buttons remain enabled for the deferred empty-workflows error
  // (the attempt is intercepted and canceled instead). Only the immediate,
  // always-blocking errors disable the buttons.
  const isWorkflowConfigurationValid = useMemo(
    () => !alertRetrievalHasError && !validationHasError,
    [alertRetrievalHasError, validationHasError]
  );

  const settingsView = useMemo(
    () => (
      <>
        {isWorkflowsEnabled ? (
          <WorkflowSettingsView
            alertRetrievalHasError={alertRetrievalSectionHasError}
            alertsPreviewStackBy0={alertsPreviewStackBy0}
            alertSummaryStackBy0={alertSummaryStackBy0}
            connectorId={localConnectorId}
            fetchDefaultEsqlQueryResult={fetchDefaultEsqlQueryResult}
            filterManager={filterManager.current}
            onConnectorIdSelected={handleLocalConnectorIdChange}
            onSettingsChanged={onSettingsChanged}
            onWorkflowConfigurationChange={handleWorkflowConfigurationChange}
            validationHasError={validationHasError}
            setAlertsPreviewStackBy0={setAlertsPreviewStackBy0}
            setAlertSummaryStackBy0={setAlertSummaryStackBy0}
            settings={settings}
            showConnectorSelector={showConnectorSelector}
            workflowConfiguration={workflowConfiguration}
            workflowValidationItems={workflowValidationItems}
          />
        ) : (
          <AlertSelection
            alertsPreviewStackBy0={alertsPreviewStackBy0}
            alertSummaryStackBy0={alertSummaryStackBy0}
            connectorId={localConnectorId}
            filterManager={filterManager.current}
            onConnectorIdSelected={handleLocalConnectorIdChange}
            onSettingsChanged={onSettingsChanged}
            setAlertsPreviewStackBy0={setAlertsPreviewStackBy0}
            setAlertSummaryStackBy0={setAlertSummaryStackBy0}
            settings={settings}
            showConnectorSelector={showConnectorSelector}
          />
        )}
      </>
    ),
    [
      alertRetrievalSectionHasError,
      alertSummaryStackBy0,
      alertsPreviewStackBy0,
      fetchDefaultEsqlQueryResult,
      handleLocalConnectorIdChange,
      handleWorkflowConfigurationChange,
      isWorkflowsEnabled,
      localConnectorId,
      onSettingsChanged,
      validationHasError,
      settings,
      showConnectorSelector,
      workflowConfiguration,
      workflowValidationItems,
    ]
  );

  useEffect(() => {
    let isSubscribed = true;

    // init the Filter manager with the local filters:
    filterManager.current.setFilters(settings.filters);

    // subscribe to filter updates:
    const subscription = filterManager.current.getUpdates$().subscribe({
      next: () => {
        if (isSubscribed) {
          const newFilters = filterManager.current.getFilters();

          onSettingsChanged?.({
            ...settings,
            filters: newFilters,
          });
        }
      },
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [onSettingsChanged, settings]);

  const getWorkflowConfigTelemetryParams = useCallback(() => {
    const queryMode =
      draftWorkflowConfiguration.alertRetrievalMode === 'esql' ? 'esql' : 'custom_query';

    return {
      custom_retrieval_workflow_count: draftWorkflowConfiguration.alertRetrievalWorkflowIds.length,
      alert_retrieval_mode: draftWorkflowConfiguration.alertRetrievalMode,
      query_mode: queryMode as 'custom_query' | 'esql',
      uses_default_validation:
        draftWorkflowConfiguration.validationWorkflowId === 'default' ||
        draftWorkflowConfiguration.validationWorkflowId === '',
    };
  }, [draftWorkflowConfiguration]);

  const handleSave = useCallback(() => {
    // Cancel the save and reveal the deferred error when the alert retrieval
    // workflows toggle is the sole retrieval source but no workflow is selected.
    if (emptyRetrievalWorkflows) {
      setHasAttemptedSave(true);
      return;
    }

    telemetry.reportEvent(
      AttackDiscoveryEventTypes.SettingsSaved,
      getWorkflowConfigTelemetryParams()
    );

    if (localConnectorId && localConnectorId !== connectorId) {
      onConnectorIdSelected(localConnectorId);
    }

    if (isWorkflowsEnabled) {
      persistWorkflowSettings(draftWorkflowConfiguration);
    }

    onSettingsSave?.();
  }, [
    connectorId,
    draftWorkflowConfiguration,
    emptyRetrievalWorkflows,
    getWorkflowConfigTelemetryParams,
    isWorkflowsEnabled,
    localConnectorId,
    onConnectorIdSelected,
    onSettingsSave,
    persistWorkflowSettings,
    telemetry,
  ]);

  const onSaveAndRun = useCallback(() => {
    // Cancel the run and reveal the deferred error when the alert retrieval
    // workflows toggle is the sole retrieval source but no workflow is selected.
    if (emptyRetrievalWorkflows) {
      setHasAttemptedSave(true);
      return;
    }

    telemetry.reportEvent(
      AttackDiscoveryEventTypes.SaveAndRunClicked,
      getWorkflowConfigTelemetryParams()
    );

    handleSave();

    // Convert settings to filter query for overrides
    const [filterQuery, kqlError] = convertToBuildEsQuery({
      config: getEsQueryConfig(uiSettings),
      dataView,
      queries: [settings.query],
      filters: settings.filters,
    });

    const overrideFilter = parseFilterQuery({ filterQuery, kqlError });

    // Pass the localConnectorId and settings overrides to ensure we use the selected values
    onGenerate?.({
      overrideConnectorId: localConnectorId,
      overrideEnd: settings.end,
      overrideFilter,
      overrideSize: settings.size,
      overrideStart: settings.start,
      trigger: 'save_and_run',
    });
  }, [
    dataView,
    emptyRetrievalWorkflows,
    getWorkflowConfigTelemetryParams,
    handleSave,
    localConnectorId,
    onGenerate,
    settings.end,
    settings.filters,
    settings.query,
    settings.size,
    settings.start,
    telemetry,
    uiSettings,
  ]);

  const actionButtons = useMemo(() => {
    const isSaveDisabled = localConnectorId == null || !isWorkflowConfigurationValid;
    const saveTooltipContent =
      localConnectorId == null
        ? i18n.SELECT_A_CONNECTOR_TO_SAVE
        : !isWorkflowConfigurationValid
        ? i18n.WORKFLOW_CONFIGURATION_INVALID
        : undefined;

    return (
      <EuiFlexGroup
        alignItems="center"
        css={css`
          gap: 16px;
        `}
        gutterSize="none"
        responsive={false}
      >
        <EuiFlexItem
          css={css`
            margin-right: ${euiTheme.size.s};
          `}
          grow={false}
        >
          <EuiButtonEmpty data-test-subj="reset" flush="both" onClick={handleReset} size="m">
            {i18n.RESET}
          </EuiButtonEmpty>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiToolTip content={saveTooltipContent} position="top">
            <EuiButton
              color="primary"
              css={css`
                min-inline-size: 80px;
                width: 80px;
              `}
              data-test-subj="save"
              isDisabled={isSaveDisabled}
              onClick={handleSave}
              size="m"
            >
              {i18n.SAVE}
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiToolTip content={saveTooltipContent} position="top">
            <EuiButton
              data-test-subj="saveAndRun"
              isDisabled={isSaveDisabled}
              fill
              iconType="play"
              onClick={onSaveAndRun}
              size="m"
            >
              {i18n.SAVE_AND_RUN}
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [
    euiTheme.size.s,
    handleReset,
    handleSave,
    isWorkflowConfigurationValid,
    localConnectorId,
    onSaveAndRun,
  ]);

  return {
    actionButtons,
    alertRetrievalHasError,
    alertsPreviewStackBy0,
    alertSummaryStackBy0,
    fetchDefaultEsqlQueryResult,
    filterManager: filterManager.current,
    setAlertsPreviewStackBy0,
    setAlertSummaryStackBy0,
    settingsView,
    validationHasError,
  };
};
