/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSuperSelect,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { isEqual } from 'lodash';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { ConnectorSelector } from '@kbn/security-solution-connectors';
import { AiIcon } from '@kbn/shared-ux-ai-components';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { WorkflowsManagementUiActions } from '@kbn/workflows';
import { TAG_PREFIX_PATTERN } from '../../../../../common/workflows/alert_analysis_workflow';
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
import { useAlertAnalysisWorkflowAgents } from './use_alert_analysis_workflow_agents';
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
  const { agents, isLoading: isLoadingAgents } = useAlertAnalysisWorkflowAgents(canAccessPage);
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
  // The confidence thresholds only apply to auto-close, so their range is only validated (and only
  // blocks saving) when auto-close is enabled. When it is off the inputs are disabled and their
  // values are irrelevant.
  const isThresholdRangeInvalid =
    pageSettings !== undefined &&
    pageSettings.autoCloseEnabled &&
    !(
      pageSettings.autoCloseConfidenceScoreMinThreshold <
      pageSettings.autoCloseConfidenceScoreMaxThreshold
    );
  // Mirror the server-side tag prefix validation (charset + at least one alphanumeric) so an invalid
  // value is flagged inline and the Save button is disabled, rather than letting the PUT through to a
  // 400. Tested against the raw value because the server does not trim.
  const isTagPrefixInvalid =
    pageSettings !== undefined && !TAG_PREFIX_PATTERN.test(pageSettings.tagPrefix ?? '');
  const selectedAgentId = pageSettings?.agentId ?? agentBuilderDefaultAgentId;
  const agentOptions = useMemo<Array<EuiSuperSelectOption<string>>>(() => {
    const options = agents.map((agent) => ({ value: agent.id, inputDisplay: agent.name }));
    // Keep the currently selected agent visible even if it is missing from the fetched list (for
    // example a custom agent that was deleted), so the selection is never silently lost.
    if (selectedAgentId && !options.some((option) => option.value === selectedAgentId)) {
      options.push({ value: selectedAgentId, inputDisplay: selectedAgentId });
    }
    return options;
  }, [agents, selectedAgentId]);
  const saveSettingsMutation = useMutation({
    mutationFn: async (settingsToSave: AlertAnalysisWorkflowSettingsWithConnector) => {
      return saveAlertAnalysisWorkflowSettings({ http, settings: settingsToSave });
    },
    onSuccess: (response) => {
      setPageSettings(response.settings);
      queryClient.setQueryData(ALERT_ANALYSIS_WORKFLOW_SETTINGS_QUERY_KEY, response);
      notifications.toasts.addSuccess(translations.SAVE_SUCCESS_MESSAGE);
    },
    onError: (error: AlertAnalysisWorkflowSettingsError) => {
      notifications.toasts.addDanger({
        title: translations.SAVE_ERROR_MESSAGE,
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
                  aria-label={translations.WORKFLOW_ENABLED_ARIA_LABEL}
                  label={translations.WORKFLOW_ENABLED_HIDDEN_LABEL}
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
              <EuiFormRow fullWidth label={translations.CONNECTOR_LABEL}>
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
                    id="xpack.securitySolution.alertAnalysisWorkflow.agentSectionTitle"
                    defaultMessage="Agent"
                  />
                </h4>
              }
              description={
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.alertAnalysisWorkflow.agentSectionDescription"
                    defaultMessage="Select the Agent Builder agent used to analyze alerts. Choose the default agent or one of your custom agents."
                  />
                </p>
              }
            >
              <EuiFormRow fullWidth label={translations.AGENT_LABEL}>
                <EuiSuperSelect
                  data-test-subj="alertAnalysisWorkflowAgentSelector"
                  options={agentOptions}
                  valueOfSelected={selectedAgentId}
                  isLoading={isLoadingAgents}
                  disabled={!canEditAdvancedSettings || !isWorkflowEnabled}
                  aria-label={translations.AGENT_ARIA_LABEL}
                  onChange={(agentId) =>
                    setPageSettings((prev) => (prev ? { ...prev, agentId } : prev))
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
                  aria-label={translations.CREATE_CONVERSATION_ARIA_LABEL}
                  label={translations.CREATE_CONVERSATION_HIDDEN_LABEL}
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
                  aria-label={translations.AUTO_CLOSE_ENABLED_ARIA_LABEL}
                  label={translations.AUTO_CLOSE_ENABLED_HIDDEN_LABEL}
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
                  disabled={
                    !canEditAdvancedSettings || !isWorkflowEnabled || !pageSettings.autoCloseEnabled
                  }
                  isInvalid={isThresholdRangeInvalid}
                  aria-label={translations.MIN_THRESHOLD_ARIA_LABEL}
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
                error={isThresholdRangeInvalid ? translations.THRESHOLD_RANGE_ERROR : undefined}
              >
                <EuiFieldNumber
                  data-test-subj="alertAnalysisWorkflowMaxThreshold"
                  min={0}
                  max={1}
                  step={0.01}
                  value={pageSettings.autoCloseConfidenceScoreMaxThreshold}
                  disabled={
                    !canEditAdvancedSettings || !isWorkflowEnabled || !pageSettings.autoCloseEnabled
                  }
                  isInvalid={isThresholdRangeInvalid}
                  aria-label={translations.MAX_THRESHOLD_ARIA_LABEL}
                  onChange={(event) =>
                    setPageSettings({
                      ...pageSettings,
                      autoCloseConfidenceScoreMaxThreshold: event.target.valueAsNumber,
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
                    id="xpack.securitySolution.alertAnalysisWorkflow.tagPrefixLabel"
                    defaultMessage="Alert tag prefix"
                  />
                </h4>
              }
              description={
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.alertAnalysisWorkflow.tagPrefixHelpText"
                    defaultMessage="Prefix for the tags the workflow adds to alerts it analyzes (for example alert-analysis.classification.false_positive). Changing it means alerts tagged under the old prefix are no longer recognized as analyzed."
                  />
                </p>
              }
            >
              <EuiFormRow
                fullWidth
                isInvalid={isTagPrefixInvalid}
                error={isTagPrefixInvalid ? translations.TAG_PREFIX_ERROR : undefined}
              >
                <EuiFieldText
                  data-test-subj="alertAnalysisWorkflowTagPrefix"
                  value={pageSettings.tagPrefix ?? ''}
                  disabled={!canEditAdvancedSettings || !isWorkflowEnabled}
                  isInvalid={isTagPrefixInvalid}
                  aria-label={translations.TAG_PREFIX_ARIA_LABEL}
                  onChange={(event) =>
                    setPageSettings({
                      ...pageSettings,
                      tagPrefix: event.target.value,
                    })
                  }
                />
              </EuiFormRow>
            </EuiDescribedFormGroup>
            <EuiButton
              data-test-subj="alertAnalysisWorkflowSaveButton"
              fill
              disabled={
                !canEditAdvancedSettings ||
                !isDirty ||
                isThresholdRangeInvalid ||
                isTagPrefixInvalid
              }
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
