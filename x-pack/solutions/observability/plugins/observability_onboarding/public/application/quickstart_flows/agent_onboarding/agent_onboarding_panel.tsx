/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPanel,
  EuiSteps,
  EuiCodeBlock,
  EuiSpacer,
  EuiSkeletonText,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { CopyToClipboardButton } from '../shared/copy_to_clipboard_button';
import { EmptyPrompt } from '../shared/empty_prompt';
import { FeedbackButtons } from '../shared/feedback_buttons';
import { useFlowBreadcrumb } from '../../shared/use_flow_breadcrumbs';
import { useFetcher } from '../../../hooks/use_fetcher';

export const AgentOnboardingPanel: FunctionComponent = () => {
  useFlowBreadcrumb({
    text: i18n.translate(
      'xpack.observability_onboarding.agentOnboardingPanel.breadcrumbs.label',
      { defaultMessage: 'AI-guided onboarding' }
    ),
  });

  const { data, error, refetch } = useFetcher(
    (callApi) => callApi('POST /internal/observability_onboarding/agent/flow'),
    [],
    { showToastOnError: false }
  );

  if (error) {
    return (
      <EmptyPrompt onboardingFlowType="agent-onboarding" error={error} onRetryClick={refetch} />
    );
  }

  const installSkillCommand = data
    ? `curl ${data.skillInstallScriptUrl} -so install_agent_skill.sh && bash install_agent_skill.sh --kibana-url=${data.kibanaUrl}`
    : undefined;

  const runOnboardingCommand = data
    ? [
        `export ES_SHIPPER_KEY=${data.shipperApiKeyEncoded}`,
        `export ES_VERIFICATION_KEY=${data.verificationApiKeyEncoded}`,
        `export ES_HOST=${data.elasticsearchUrl}`,
        `export KIBANA_URL=${data.kibanaUrl}`,
        `export ELASTIC_STACK_VERSION=${data.stackVersion}`,
        '',
        'claude "help me onboard elastic"',
      ].join('\n')
    : undefined;

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <EuiSteps
        steps={[
          {
            title: i18n.translate(
              'xpack.observability_onboarding.agentOnboardingPanel.installClaudeCodeLabel',
              { defaultMessage: 'Install Claude Code' }
            ),
            status: 'current',
            children: (
              <>
                <EuiText>
                  <p>
                    {i18n.translate(
                      'xpack.observability_onboarding.agentOnboardingPanel.installClaudeCodeDescription',
                      {
                        defaultMessage:
                          'Claude Code is a terminal-based AI assistant that will guide you through setting up observability on your systems. Install it by following the instructions at:',
                      }
                    )}
                  </p>
                </EuiText>
                <EuiSpacer size="s" />
                <EuiLink
                  href="https://docs.anthropic.com/en/docs/claude-code"
                  target="_blank"
                  external
                >
                  {i18n.translate(
                    'xpack.observability_onboarding.agentOnboardingPanel.claudeCodeDocsLink',
                    { defaultMessage: 'Claude Code documentation' }
                  )}
                </EuiLink>
              </>
            ),
          },
          {
            title: i18n.translate(
              'xpack.observability_onboarding.agentOnboardingPanel.installSkillLabel',
              { defaultMessage: 'Download the onboarding skill' }
            ),
            status: 'incomplete',
            children: installSkillCommand ? (
              <>
                <EuiText>
                  <p>
                    {i18n.translate(
                      'xpack.observability_onboarding.agentOnboardingPanel.installSkillDescription',
                      {
                        defaultMessage:
                          'Run the following command to download the Elastic Observability onboarding skill for Claude Code:',
                      }
                    )}
                  </p>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiCodeBlock
                  paddingSize="m"
                  language="text"
                  data-test-subj="observabilityOnboardingAgentSkillInstallSnippet"
                >
                  {installSkillCommand}
                </EuiCodeBlock>
                <EuiSpacer />
                <CopyToClipboardButton textToCopy={installSkillCommand} fill={false} />
              </>
            ) : (
              <EuiSkeletonText lines={3} />
            ),
          },
          {
            title: i18n.translate(
              'xpack.observability_onboarding.agentOnboardingPanel.runOnboardingLabel',
              { defaultMessage: 'Start the AI-guided onboarding' }
            ),
            status: 'incomplete',
            children: runOnboardingCommand ? (
              <>
                <EuiText>
                  <p>
                    {i18n.translate(
                      'xpack.observability_onboarding.agentOnboardingPanel.runOnboardingDescription',
                      {
                        defaultMessage:
                          'Set the environment variables and start Claude Code. It will auto-detect your environment, propose a setup plan, and install the right collector for your systems.',
                      }
                    )}
                  </p>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiCodeBlock
                  paddingSize="m"
                  language="text"
                  data-test-subj="observabilityOnboardingAgentOnboardingPanelCodeSnippet"
                >
                  {runOnboardingCommand}
                </EuiCodeBlock>
                <EuiSpacer />
                <CopyToClipboardButton textToCopy={runOnboardingCommand} fill />
                <EuiSpacer size="l" />
                <EuiText size="s" color="subdued">
                  <p>
                    {i18n.translate(
                      'xpack.observability_onboarding.agentOnboardingPanel.whatHappensNext',
                      {
                        defaultMessage:
                          'Claude will ask what you want to monitor, scan your system for Kubernetes clusters, Docker containers, and running services, then install and configure the Elastic Distribution of OTel Collector. Once data starts flowing, it will point you to the right dashboards in Kibana.',
                      }
                    )}
                  </p>
                </EuiText>
              </>
            ) : (
              <EuiSkeletonText lines={6} />
            ),
          },
        ]}
      />
      <FeedbackButtons flow="agent-onboarding" />
    </EuiPanel>
  );
};
