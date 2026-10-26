/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/ui-ai-components';
import { CliInstallModal } from '@kbn/shared-components';
import { useKibana } from '../../services';
import {
  AGENT_ONBOARDING_MESSAGE,
  AGENT_PROMPT,
  AGENT_SESSION_TAG,
} from '../constants/agent_options';
import { PromptModal } from './prompt_modal';

interface OnboardingOptionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const OnboardingOption = ({ title, description, children }: OnboardingOptionProps) => (
  <EuiFlexItem>
    <EuiTitle size="xxs">
      <h3>{title}</h3>
    </EuiTitle>
    <EuiSpacer size="xs" />
    <EuiText size="s" color="subdued">
      <p>{description}</p>
    </EuiText>
    <EuiSpacer size="m" />
    <span>{children}</span>
  </EuiFlexItem>
);

interface OnboardingOptionsProps {
  elasticsearchUrl: string | null;
}

export const OnboardingOptions = ({ elasticsearchUrl }: OnboardingOptionsProps) => {
  const {
    services: { agentBuilder },
  } = useKibana();
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isCliModalOpen, setIsCliModalOpen] = useState(false);

  const openElasticAgent = () =>
    agentBuilder.openChat({
      initialMessage: AGENT_ONBOARDING_MESSAGE,
      autoSendInitialMessage: true,
      newConversation: true,
      sessionTag: AGENT_SESSION_TAG,
    });

  return (
    <>
      <EuiFlexGroup gutterSize="l" data-test-subj="vectordbOnboardingOptions">
        <OnboardingOption
          title={i18n.translate('vectordbOnboarding.options.prompt.title', {
            defaultMessage: 'Prompt your agent',
          })}
          description={i18n.translate('vectordbOnboarding.options.prompt.description', {
            defaultMessage: 'Install Elastic skills and quickly set up your codebase.',
          })}
        >
          <EuiButton
            color="text"
            size="s"
            iconType="comment"
            onClick={() => setIsPromptModalOpen(true)}
            data-test-subj="vectordbOnboardingViewPrompt"
            data-telemetry-id="vectordbOnboarding-pathSelection-viewPrompt"
          >
            {i18n.translate('vectordbOnboarding.options.prompt.cta', {
              defaultMessage: 'View prompt',
            })}
          </EuiButton>
        </OnboardingOption>
        <OnboardingOption
          title={i18n.translate('vectordbOnboarding.options.cli.title', {
            defaultMessage: 'Build from your terminal',
          })}
          description={i18n.translate('vectordbOnboarding.options.cli.description', {
            defaultMessage: 'Query and manage this project with the Elastic CLI.',
          })}
        >
          <EuiButton
            color="text"
            size="s"
            iconType="commandLine"
            onClick={() => setIsCliModalOpen(true)}
            data-test-subj="vectordbOnboardingInstallCli"
            data-telemetry-id="vectordbOnboarding-pathSelection-installCli"
          >
            {i18n.translate('vectordbOnboarding.options.cli.cta', {
              defaultMessage: 'Install the CLI',
            })}
          </EuiButton>
        </OnboardingOption>
        <OnboardingOption
          title={i18n.translate('vectordbOnboarding.options.agent.title', {
            defaultMessage: 'Build with the Elastic Agent',
          })}
          description={i18n.translate('vectordbOnboarding.options.agent.description', {
            defaultMessage: 'Chat directly with our built-in agentic assistant.',
          })}
        >
          <AiButton
            variant="outlined"
            size="s"
            iconType="productAgent"
            onClick={openElasticAgent}
            data-test-subj="vectordbOnboardingOpenElasticAgent"
            data-telemetry-id="vectordbOnboarding-pathSelection-openElasticAgent"
          >
            {i18n.translate('vectordbOnboarding.options.agent.cta', {
              defaultMessage: 'Open Elastic AI Agent',
            })}
          </AiButton>
        </OnboardingOption>
      </EuiFlexGroup>
      {isPromptModalOpen && (
        <PromptModal prompt={AGENT_PROMPT} onClose={() => setIsPromptModalOpen(false)} />
      )}
      {isCliModalOpen && (
        <CliInstallModal
          elasticsearchUrl={elasticsearchUrl}
          onClose={() => setIsCliModalOpen(false)}
          telemetryIdPrefix="vectordbOnboarding-pathSelection-cliModal"
        />
      )}
    </>
  );
};
