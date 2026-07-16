/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { RuleNotifyWhen } from '@kbn/alerting-plugin/common';
import { ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID } from '@kbn/elastic-assistant-common';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { getSchema } from './schema';
import type { AttackDiscoveryScheduleSchema } from './types';

import { ConnectorSelectorField } from '../form_fields/connector_selector_field';
import { ScheduleField } from '../form_fields/schedule_field';
import { useSettingsView } from '../../hooks/use_settings_view';
import { useWorkflowHealthCheck } from '../../hooks/use_workflow_health_check';
import type { AlertsSelectionSettings, ValidationItem } from '../../types';
import type { WorkflowConfiguration } from '../../workflow_configuration/types';
import {
  AlertRetrievalStep,
  ConnectorTypeSelectorPanel,
  DEFAULT_WORKFLOW_CONFIGURATION,
  GenerationStep,
  hasAtLeastOneRetrievalToggle,
  hasEmptyRequiredRetrievalWorkflows,
  NotificationsStep,
  ValidationPanel,
  ValidationStep,
} from '../../workflow_configuration';
import * as workflowI18n from '../../workflow_configuration/translations';
import { AlertRetrievalContent } from '../../workflow_settings_view/alert_retrieval_step/alert_retrieval_content';
import { WorkflowValidationCallouts } from '../../workflow_settings_view/components';
import { RuleActionsField } from '../../../../../common/components/rule_actions_field';
import { useKibana } from '../../../../../common/lib/kibana';
import { useConnectors } from '../../../../../common/hooks/use_connectors';
import type { FormHook } from '../../../../../shared_imports';
import {
  Field,
  Form,
  UseField,
  getUseField,
  useForm,
  useFormData,
} from '../../../../../shared_imports';
import { getMessageVariables } from './message_variables';

const CommonUseField = getUseField({ component: Field });

export interface FormState {
  value: AttackDiscoveryScheduleSchema;
  isValid?: boolean;
  submit: FormHook<AttackDiscoveryScheduleSchema>['submit'];
}

export interface FormProps {
  initialValue: AttackDiscoveryScheduleSchema;
  isWorkflowsEnabled?: boolean;
  onChange: (state: FormState) => void;
  onFormMutated?: () => void;
}

export const EditForm: React.FC<FormProps> = React.memo((props) => {
  const {
    initialValue,
    isWorkflowsEnabled: isWorkflowsEnabledProp,
    onChange,
    onFormMutated,
  } = props;
  const {
    featureFlags,
    triggersActionsUi: { actionTypeRegistry },
    http,
  } = useKibana().services;
  const { connectors, setCurrentConnector } = useConnectors({ http });

  const [isWorkflowsEnabledFlag, setIsWorkflowsEnabledFlag] = useState(false);

  useEffect(() => {
    const loadFeatureFlag = async () => {
      const enabled = await featureFlags.getBooleanValue(
        'securitySolution.attackDiscoveryWorkflowsEnabled',
        false
      );
      setIsWorkflowsEnabledFlag(enabled);
    };
    loadFeatureFlag();
  }, [featureFlags]);

  const isWorkflowsEnabled = isWorkflowsEnabledProp ?? isWorkflowsEnabledFlag;

  const schema = useMemo(
    () => getSchema({ actionTypeRegistry, connectors }),
    [actionTypeRegistry, connectors]
  );

  const { form } = useForm<AttackDiscoveryScheduleSchema>({
    defaultValue: initialValue,
    options: { stripEmptyFields: false },
    schema,
  });

  const [{ value }] = useFormData<{ value: AttackDiscoveryScheduleSchema }>({ form });
  const { isValid, setFieldValue, submit } = form;

  const [settings, setSettings] = useState<AlertsSelectionSettings>(
    initialValue.alertsSelectionSettings
  );

  const onSettingsChanged = useCallback(
    (newSettings: AlertsSelectionSettings) => {
      setSettings(newSettings);
      setFieldValue('alertsSelectionSettings', newSettings);
      onFormMutated?.();
    },
    [onFormMutated, setFieldValue]
  );

  const [connectorId, setConnectorId] = React.useState<string | undefined>(
    initialValue?.connectorId
  );

  const onConnectorIdSelected = useCallback(
    (selectedConnectorId: string) => {
      setConnectorId(selectedConnectorId);
      setFieldValue('connectorId', selectedConnectorId);
      onFormMutated?.();
    },
    [onFormMutated, setFieldValue]
  );

  const {
    alertsPreviewStackBy0,
    alertSummaryStackBy0,
    fetchDefaultEsqlQueryResult,
    filterManager,
    setAlertsPreviewStackBy0,
    setAlertSummaryStackBy0,
    settingsView,
  } = useSettingsView({
    connectorId,
    isWorkflowsEnabledOverride: isWorkflowsEnabled ? false : undefined,
    onConnectorIdSelected,
    onSettingsChanged,
    settings,
    showConnectorSelector: false,
  });

  const messageVariables = useMemo(() => {
    return getMessageVariables();
  }, []);

  const ruleActionsComponentProps = useMemo(
    () => ({
      ruleTypeId: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
      messageVariables,
      defaultRuleFrequency: {
        notifyWhen: RuleNotifyWhen.ACTIVE,
        throttle: null,
        summary: false,
      },
      onNewConnectorCreated: (connector: ActionConnector) => setCurrentConnector(connector),
    }),
    [messageVariables, setCurrentConnector]
  );

  // Workflow configuration state (only used when feature flag is ON)
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfiguration>(
    initialValue.workflowConfig ?? DEFAULT_WORKFLOW_CONFIGURATION
  );

  const handleWorkflowConfigurationChange = useCallback(
    (newConfig: WorkflowConfiguration) => {
      setWorkflowConfig(newConfig);
      setFieldValue('workflowConfig', newConfig);
      onFormMutated?.();
    },
    [onFormMutated, setFieldValue]
  );

  const handleValidationWorkflowChange = useCallback(
    (validationWorkflowId: string) => {
      handleWorkflowConfigurationChange({
        ...workflowConfig,
        validationWorkflowId,
      });
    },
    [handleWorkflowConfigurationChange, workflowConfig]
  );

  const alertRetrievalHasError = useMemo(() => {
    if (!isWorkflowsEnabled) {
      return false;
    }
    return !hasAtLeastOneRetrievalToggle(workflowConfig);
  }, [isWorkflowsEnabled, workflowConfig]);

  const validationHasError = useMemo(() => {
    if (!isWorkflowsEnabled) {
      return false;
    }
    return !workflowConfig.validationWorkflowId;
  }, [isWorkflowsEnabled, workflowConfig.validationWorkflowId]);

  // Deferred validation: the alert retrieval workflows toggle is the sole enabled
  // retrieval source but no workflow is selected. This must NOT surface
  // immediately; instead a Save attempt is canceled and the error is revealed.
  const emptyRetrievalWorkflows = useMemo(
    () => Boolean(isWorkflowsEnabled) && hasEmptyRequiredRetrievalWorkflows(workflowConfig),
    [isWorkflowsEnabled, workflowConfig]
  );

  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);

  // Once the misconfiguration is resolved, reset the attempt flag so the error
  // only ever reappears after another Save attempt.
  useEffect(() => {
    if (!emptyRetrievalWorkflows) {
      setHasAttemptedSave(false);
    }
  }, [emptyRetrievalWorkflows]);

  const showEmptyRetrievalWorkflowsError = hasAttemptedSave && emptyRetrievalWorkflows;

  const alertRetrievalSectionHasError = alertRetrievalHasError || showEmptyRetrievalWorkflowsError;

  // Wrap the form submit so a Save attempt with the empty-workflows
  // misconfiguration is canceled (`isValid: false`) and the deferred error is
  // revealed, without disabling the Save button up front.
  const handleSubmit = useCallback<FormHook<AttackDiscoveryScheduleSchema>['submit']>(async () => {
    const result = await submit();

    if (emptyRetrievalWorkflows) {
      setHasAttemptedSave(true);
      return { ...result, isValid: false };
    }

    return result;
  }, [emptyRetrievalWorkflows, submit]);

  useEffect(() => {
    onChange({
      isValid,
      submit: handleSubmit,
      value,
    });
  }, [handleSubmit, isValid, onChange, value]);

  const healthCheckWarnings = useWorkflowHealthCheck({
    isWorkflowsEnabled,
    workflowConfiguration: workflowConfig,
  });

  const workflowValidationItems = useMemo<readonly ValidationItem[]>(() => {
    const errors: ValidationItem[] = [
      ...(alertRetrievalHasError
        ? [{ level: 'error' as const, message: workflowI18n.NO_ALERT_RETRIEVAL_METHOD_SELECTED }]
        : []),
      ...(showEmptyRetrievalWorkflowsError
        ? [{ level: 'error' as const, message: workflowI18n.NO_ALERT_RETRIEVAL_WORKFLOWS_SELECTED }]
        : []),
      ...(validationHasError
        ? [{ level: 'error' as const, message: workflowI18n.NO_VALIDATION_WORKFLOW_SELECTED }]
        : []),
    ];

    return [...errors, ...healthCheckWarnings];
  }, [
    alertRetrievalHasError,
    healthCheckWarnings,
    showEmptyRetrievalWorkflowsError,
    validationHasError,
  ]);

  return (
    <Form form={form} data-test-subj="attackDiscoveryScheduleForm">
      <EuiFlexGroup direction="column" responsive={false}>
        <EuiFlexItem>
          <CommonUseField
            path="name"
            componentProps={{
              'data-test-subj': 'attackDiscoveryFormNameField',
              euiFieldProps: {
                'data-test-subj': 'attackDiscoveryFormNameInput',
                autoFocus: true,
              },
            }}
          />
        </EuiFlexItem>
        {isWorkflowsEnabled ? (
          <EuiFlexItem>
            <WorkflowValidationCallouts workflowValidationItems={workflowValidationItems} />

            <AlertRetrievalStep hasError={alertRetrievalSectionHasError} isLast={false}>
              <UseField path="alertsSelectionSettings">{() => null}</UseField>
              <UseField path="workflowConfig">{() => null}</UseField>
              <AlertRetrievalContent
                alertRetrievalHasError={alertRetrievalSectionHasError}
                alertsPreviewStackBy0={alertsPreviewStackBy0}
                alertSummaryStackBy0={alertSummaryStackBy0}
                connectorId={connectorId}
                fetchDefaultEsqlQueryResult={fetchDefaultEsqlQueryResult}
                filterManager={filterManager}
                onConnectorIdSelected={onConnectorIdSelected}
                onSettingsChanged={onSettingsChanged}
                onWorkflowConfigurationChange={handleWorkflowConfigurationChange}
                setAlertsPreviewStackBy0={setAlertsPreviewStackBy0}
                setAlertSummaryStackBy0={setAlertSummaryStackBy0}
                settings={settings}
                workflowConfiguration={workflowConfig}
              />
            </AlertRetrievalStep>

            <GenerationStep isLast={false}>
              <UseField
                path="connectorId"
                component={ConnectorSelectorField}
                componentProps={{
                  connectorId,
                  onConnectorIdSelected,
                }}
              />
              <UseField path="interval" component={ScheduleField} />
            </GenerationStep>

            <ValidationStep hasError={validationHasError} isLast={false}>
              <ValidationPanel
                isInvalid={validationHasError}
                onChange={handleValidationWorkflowChange}
                value={workflowConfig.validationWorkflowId}
              />
            </ValidationStep>

            <NotificationsStep>
              <ConnectorTypeSelectorPanel>
                <UseField
                  path="actions"
                  component={RuleActionsField}
                  componentProps={ruleActionsComponentProps}
                />
              </ConnectorTypeSelectorPanel>
            </NotificationsStep>
          </EuiFlexItem>
        ) : (
          <>
            <EuiFlexItem>
              <UseField
                path="connectorId"
                component={ConnectorSelectorField}
                componentProps={{
                  connectorId,
                  onConnectorIdSelected,
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <UseField path="alertsSelectionSettings">{() => <>{settingsView}</>}</UseField>
            </EuiFlexItem>
          </>
        )}

        {!isWorkflowsEnabled && (
          <>
            <EuiFlexItem>
              <UseField path="interval" component={ScheduleField} />
            </EuiFlexItem>
            <EuiFlexItem>
              <UseField
                path="actions"
                component={RuleActionsField}
                componentProps={ruleActionsComponentProps}
              />
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    </Form>
  );
});
EditForm.displayName = 'EditForm';
