/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButton,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { ConnectorSelector } from '@kbn/security-solution-connectors';
import { AiIcon } from '@kbn/shared-ux-ai-components';
import { WorkflowsManagementUiActions } from '@kbn/workflows';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { HeaderPage } from '../../../../common/components/header_page';
import { ExperimentalBadge } from '../../../../common/components/experimental_badge';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { NotFoundPage } from '../../../../app/404';
import { SecurityPageName } from '../../../../app/types';
import { useKibana } from '../../../../common/lib/kibana';
import { useLicense } from '../../../../common/hooks/use_license';
import { useAIConnectors } from '../../../../common/hooks/use_ai_connectors';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import {
  fetchAlertAnalysisWorkflowSettings,
  saveAlertAnalysisWorkflowSettings,
  type AlertAnalysisWorkflowSettingsWithConnector,
} from './api';
import { AlertAnalysisWorkflowRuleAttachmentSection } from './rule_attachment_section';
import * as translations from './translations';

const ALERT_ANALYSIS_WORKFLOW_SETTINGS_QUERY_KEY = [
  'alertAnalysisWorkflow',
  'alertAnalysisWorkflowSettings',
] as const;

type AlertAnalysisWorkflowSettingsError = Error & { body?: { message?: string } };

export const AlertAnalysisWorkflowPage: React.FC = () => {
  const {
    services: { application, http, notifications, settings },
  } = useKibana();
  const queryClient = useQueryClient();
  const isEnterprise = useLicense().isEnterprise();
  const { edit: canEditRules } = useUserPrivileges().rulesPrivileges.rules;
  const canEditWorkflow =
    application.capabilities.workflowsManagement?.[WorkflowsManagementUiActions.update] === true;
  const canEditAdvancedSettings = Boolean(
    application.capabilities.advancedSettings?.save && canEditRules && canEditWorkflow
  );
  const canAccessPage = isEnterprise && canEditAdvancedSettings;
  const { aiConnectors, isLoading: isLoadingConnectors } = useAIConnectors();
  const { data: savedSettingsResponse, isLoading } = useQuery({
    queryKey: ALERT_ANALYSIS_WORKFLOW_SETTINGS_QUERY_KEY,
    enabled: canAccessPage,
    queryFn: async () => {
      return fetchAlertAnalysisWorkflowSettings({ http });
    },
  });
  const savedSettings = savedSettingsResponse?.settings;
  const workflowHref = savedSettingsResponse?.workflowId
    ? application.getUrlForApp('workflows', { path: `/${savedSettingsResponse.workflowId}` })
    : undefined;
  const [pageSettings, setPageSettings] = useState<
    AlertAnalysisWorkflowSettingsWithConnector | undefined
  >();
  const isDirty = !isEqual(pageSettings, savedSettings);
  const isWorkflowEnabled = pageSettings?.workflowEnabled ?? true;
  const isThresholdRangeInvalid =
    pageSettings !== undefined &&
    !(
      pageSettings.autoCloseConfidenceScoreMinThreshold <
      pageSettings.autoCloseConfidenceScoreMaxThreshold
    );
  const thresholdRangeErrorMessage = i18n.translate(
    'xpack.securitySolution.alertAnalysisWorkflow.thresholdRangeErrorMessage',
    {
      defaultMessage: 'Minimum confidence score must be lower than maximum confidence score.',
    }
  );
  const saveSettingsMutation = useMutation({
    mutationFn: async (settingsToSave: AlertAnalysisWorkflowSettingsWithConnector) => {
      return saveAlertAnalysisWorkflowSettings({ http, settings: settingsToSave });
    },
    onSuccess: (response) => {
      setPageSettings(response.settings);
      queryClient.setQueryData(ALERT_ANALYSIS_WORKFLOW_SETTINGS_QUERY_KEY, response);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.securitySolution.alertAnalysisWorkflow.saveSuccessMessage', {
          defaultMessage: 'Alert analysis workflow settings saved',
        })
      );
    },
    onError: (error: AlertAnalysisWorkflowSettingsError) => {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.securitySolution.alertAnalysisWorkflow.saveErrorMessage', {
          defaultMessage: 'Failed to save alert analysis workflow settings',
        }),
        text: error?.body?.message ?? error?.message,
      });
    },
  });

  useEffect(() => {
    // Only initialize local edits from the fetched settings once. Re-running this on every
    // background refetch (e.g. a reconnect) would silently discard unsaved edits.
    if (savedSettings && pageSettings === undefined) {
      setPageSettings(savedSettings);
    }
  }, [savedSettings, pageSettings]);

  if (!canAccessPage) {
    return <NotFoundPage />;
  }

  return (
    <>
      <SecuritySolutionPageWrapper data-test-subj="alertAnalysisWorkflowPage">
        <HeaderPage
          title={translations.ALERT_ANALYSIS_WORKFLOW_TITLE}
          titleNode={
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="l">
                  <h1>{translations.ALERT_ANALYSIS_WORKFLOW_TITLE}</h1>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <AiIcon iconType="sparkles" size="m" aria-hidden="true" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ExperimentalBadge />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          subtitle={
            <FormattedMessage
              id="xpack.securitySolution.alertAnalysisWorkflow.description"
              defaultMessage="Configure when the managed Security alert analysis workflow automatically closes alerts classified as false positives. {workflowLink}"
              values={{
                workflowLink: workflowHref ? (
                  <EuiLink
                    data-test-subj="alertAnalysisWorkflowLink"
                    href={workflowHref}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.alertAnalysisWorkflow.workflowLinkText"
                      defaultMessage="View workflow"
                    />
                  </EuiLink>
                ) : null,
              }}
            />
          }
        />
        {isLoading || !pageSettings ? (
          <EuiLoadingSpinner data-test-subj="alertAnalysisWorkflowSettingsLoading" />
        ) : (
          <>
            <EuiDescribedFormGroup
              fullWidth
              title={
                <h4>
                  <FormattedMessage
                    id="xpack.securitySolution.alertAnalysisWorkflow.workflowEnabledSectionTitle"
                    defaultMessage="Workflow enabled"
                  />
                </h4>
              }
              description={
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.alertAnalysisWorkflow.workflowEnabledSectionDescription"
                    defaultMessage="Disabling the managed alert analysis workflow turns it off everywhere it is configured, including for any rules it is attached to."
                  />
                </p>
              }
            >
              <EuiFormRow fullWidth>
                <EuiSwitch
                  data-test-subj="alertAnalysisWorkflowEnabled"
                  showLabel={false}
                  aria-label={i18n.translate(
                    'xpack.securitySolution.alertAnalysisWorkflow.workflowEnabledAriaLabel',
                    { defaultMessage: 'Enable alert analysis workflow' }
                  )}
                  label={i18n.translate(
                    'xpack.securitySolution.alertAnalysisWorkflow.workflowEnabledHiddenLabel',
                    { defaultMessage: 'Enable alert analysis workflow' }
                  )}
                  checked={pageSettings.workflowEnabled ?? true}
                  disabled={!canEditAdvancedSettings}
                  onChange={(event) =>
                    setPageSettings({
                      ...pageSettings,
                      workflowEnabled: event.target.checked,
                    })
                  }
                />
              </EuiFormRow>
            </EuiDescribedFormGroup>
            <EuiDescribedFormGroup
              fullWidth
              title={
                <h4>
                  <FormattedMessage
                    id="xpack.securitySolution.alertAnalysisWorkflow.connectorSectionTitle"
                    defaultMessage="AI connector"
                  />
                </h4>
              }
              description={
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.alertAnalysisWorkflow.connectorSectionDescription"
                    defaultMessage="Select the AI connector used to classify alerts as false positives."
                  />
                </p>
              }
            >
              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.securitySolution.alertAnalysisWorkflow.connectorLabel',
                  { defaultMessage: 'Connector' }
                )}
              >
                <ConnectorSelector
                  data-test-subj="alertAnalysisWorkflowConnectorSelector"
                  connectors={aiConnectors}
                  selectedId={pageSettings.connectorId}
                  isLoading={isLoadingConnectors}
                  isDisabled={!canEditAdvancedSettings || !isWorkflowEnabled}
                  settings={settings}
                  onChange={(connectorId) =>
                    setPageSettings((prev) => (prev ? { ...prev, connectorId } : prev))
                  }
                />
              </EuiFormRow>
            </EuiDescribedFormGroup>
            <EuiDescribedFormGroup
              fullWidth
              title={
                <h4>
                  <FormattedMessage
                    id="xpack.securitySolution.alertAnalysisWorkflow.createConversationSectionTitle"
                    defaultMessage="Create conversation"
                  />
                </h4>
              }
              description={
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.alertAnalysisWorkflow.createConversationSectionDescription"
                    defaultMessage="When enabled, the AI agent creates a new conversation for each alert analysis. Disable to prevent large numbers of conversations from accumulating."
                  />
                </p>
              }
            >
              <EuiFormRow fullWidth>
                <EuiSwitch
                  data-test-subj="alertAnalysisWorkflowCreateConversation"
                  showLabel={false}
                  aria-label={i18n.translate(
                    'xpack.securitySolution.alertAnalysisWorkflow.createConversationAriaLabel',
                    { defaultMessage: 'Create conversation per alert analysis' }
                  )}
                  label={i18n.translate(
                    'xpack.securitySolution.alertAnalysisWorkflow.createConversationHiddenLabel',
                    { defaultMessage: 'Create conversation per alert analysis' }
                  )}
                  checked={pageSettings.createConversation ?? true}
                  disabled={!canEditAdvancedSettings || !isWorkflowEnabled}
                  onChange={(event) =>
                    setPageSettings({
                      ...pageSettings,
                      createConversation: event.target.checked,
                    })
                  }
                />
              </EuiFormRow>
            </EuiDescribedFormGroup>
            <EuiDescribedFormGroup
              fullWidth
              title={
                <h4>
                  <FormattedMessage
                    id="xpack.securitySolution.alertAnalysisWorkflow.autoCloseEnabledLabel"
                    defaultMessage="Auto-close alerts classified as false positives"
                  />
                </h4>
              }
              description={
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.alertAnalysisWorkflow.autoCloseEnabledDescription"
                    defaultMessage="Automatically closes alerts when the alert analysis workflow classifies them as false positives within the configured confidence range."
                  />
                </p>
              }
            >
              <EuiFormRow fullWidth>
                <EuiSwitch
                  data-test-subj="alertAnalysisWorkflowAutoCloseEnabled"
                  showLabel={false}
                  aria-label={i18n.translate(
                    'xpack.securitySolution.alertAnalysisWorkflow.autoCloseEnabledAriaLabel',
                    {
                      defaultMessage: 'Auto-close alerts classified as false positives',
                    }
                  )}
                  label={i18n.translate(
                    'xpack.securitySolution.alertAnalysisWorkflow.autoCloseEnabledHiddenLabel',
                    {
                      defaultMessage: 'Auto-close alerts classified as false positives',
                    }
                  )}
                  checked={pageSettings.autoCloseEnabled}
                  disabled={!canEditAdvancedSettings || !isWorkflowEnabled}
                  onChange={(event) =>
                    setPageSettings({
                      ...pageSettings,
                      autoCloseEnabled: event.target.checked,
                    })
                  }
                />
              </EuiFormRow>
            </EuiDescribedFormGroup>
            <EuiDescribedFormGroup
              fullWidth
              title={
                <h4>
                  <FormattedMessage
                    id="xpack.securitySolution.alertAnalysisWorkflow.minThresholdLabel"
                    defaultMessage="Auto-close minimum confidence score"
                  />
                </h4>
              }
              description={
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.alertAnalysisWorkflow.minThresholdHelpText"
                    defaultMessage="The lowest false positive confidence score that can automatically close an alert."
                  />
                </p>
              }
            >
              <EuiFormRow fullWidth isInvalid={isThresholdRangeInvalid}>
                <EuiFieldNumber
                  data-test-subj="alertAnalysisWorkflowMinThreshold"
                  min={0}
                  max={1}
                  step={0.01}
                  value={pageSettings.autoCloseConfidenceScoreMinThreshold}
                  disabled={!canEditAdvancedSettings || !isWorkflowEnabled}
                  isInvalid={isThresholdRangeInvalid}
                  aria-label={i18n.translate(
                    'xpack.securitySolution.alertAnalysisWorkflow.minThresholdAriaLabel',
                    {
                      defaultMessage: 'Auto-close minimum confidence score',
                    }
                  )}
                  onChange={(event) =>
                    setPageSettings({
                      ...pageSettings,
                      autoCloseConfidenceScoreMinThreshold: event.target.valueAsNumber,
                    })
                  }
                />
              </EuiFormRow>
            </EuiDescribedFormGroup>
            <EuiDescribedFormGroup
              fullWidth
              title={
                <h4>
                  <FormattedMessage
                    id="xpack.securitySolution.alertAnalysisWorkflow.maxThresholdLabel"
                    defaultMessage="Auto-close maximum confidence score"
                  />
                </h4>
              }
              description={
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.alertAnalysisWorkflow.maxThresholdHelpText"
                    defaultMessage="The highest false positive confidence score that can automatically close an alert."
                  />
                </p>
              }
            >
              <EuiFormRow
                fullWidth
                isInvalid={isThresholdRangeInvalid}
                error={isThresholdRangeInvalid ? thresholdRangeErrorMessage : undefined}
              >
                <EuiFieldNumber
                  data-test-subj="alertAnalysisWorkflowMaxThreshold"
                  min={0}
                  max={1}
                  step={0.01}
                  value={pageSettings.autoCloseConfidenceScoreMaxThreshold}
                  disabled={!canEditAdvancedSettings || !isWorkflowEnabled}
                  isInvalid={isThresholdRangeInvalid}
                  aria-label={i18n.translate(
                    'xpack.securitySolution.alertAnalysisWorkflow.maxThresholdAriaLabel',
                    {
                      defaultMessage: 'Auto-close maximum confidence score',
                    }
                  )}
                  onChange={(event) =>
                    setPageSettings({
                      ...pageSettings,
                      autoCloseConfidenceScoreMaxThreshold: event.target.valueAsNumber,
                    })
                  }
                />
              </EuiFormRow>
            </EuiDescribedFormGroup>
            <EuiButton
              data-test-subj="alertAnalysisWorkflowSaveButton"
              fill
              disabled={!canEditAdvancedSettings || !isDirty || isThresholdRangeInvalid}
              isLoading={saveSettingsMutation.isLoading}
              onClick={() => {
                if (pageSettings) {
                  saveSettingsMutation.mutate(pageSettings);
                }
              }}
            >
              <FormattedMessage
                id="xpack.securitySolution.alertAnalysisWorkflow.saveButtonLabel"
                defaultMessage="Save alert analysis workflow settings"
              />
            </EuiButton>
            <EuiSpacer size="l" />
            <AlertAnalysisWorkflowRuleAttachmentSection />
          </>
        )}
      </SecuritySolutionPageWrapper>
      <SpyRoute pageName={SecurityPageName.alertAnalysisWorkflow} />
    </>
  );
};
