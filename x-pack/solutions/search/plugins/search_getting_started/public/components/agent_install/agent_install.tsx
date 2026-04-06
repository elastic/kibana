/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButton,
  EuiIcon,
  EuiText,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { elasticsearchOnboardingAgent } from '@kbn/search-agent';
import { AiButton } from '@kbn/shared-ux-ai-components';

import anthropicIcon from '../../assets/anthropic.svg';
import cursorIcon from '../../assets/cursor.svg';
import vsCodeIcon from '../../assets/visual-studio-code.svg';

import { useKibana } from '../../hooks/use_kibana';
import { SearchGettingStartedSectionHeading } from '../section_heading';
import { PromptModal } from './prompt_modal';
import { buildPrompt } from './util';

export const AgentInstallSection = () => {
  const { services } = useKibana();
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [modalPrompt, setModalPrompt] = useState('');

  const closePromptModal = useCallback(() => setIsPromptModalOpen(false), []);

  const handleOpenInClaudeCli = useCallback(() => {
    const prompt = buildPrompt('cli');
    // Show a modal with the Claude/CLI prompt for the selected use case
    setIsPromptModalOpen(true);
    setModalPrompt(prompt);
  }, []);

  const handleOpenInAgentBuilder = useCallback(() => {
    services.agentBuilder?.openChat({
      agentId: elasticsearchOnboardingAgent.id,
      initialMessage: buildPrompt('agent-builder'),
      autoSendInitialMessage: false,
      newConversation: true,
      sessionTag: 'search-getting-started',
    });
  }, [services.agentBuilder]);

  return (
    <>
      <SearchGettingStartedSectionHeading
        icon="sparkles"
        title={i18n.translate('xpack.gettingStarted.agentInstall.title', {
          defaultMessage: 'Build with AI',
        })}
        description={i18n.translate('xpack.gettingStarted.agentInstall.description', {
          defaultMessage:
            'Get AI-powered help building search for products, docs, chatbots, recommenders, and more.',
        })}
      />
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="m" alignItems="center" direction="row">
        <EuiFlexItem>
          <EuiPanel color="subdued" hasShadow={false}>
            <EuiFlexGroup direction="column">
              <EuiTitle size="xs">
                <h5>
                  {i18n.translate('xpack.gettingStarted.agentInstall.userLLM.title', {
                    defaultMessage: 'Open your coding agent',
                  })}
                </h5>
              </EuiTitle>
              <EuiText size="xs">
                {i18n.translate('xpack.gettingStarted.agentInstall.userLLM.description', {
                  defaultMessage:
                    'Install Elastic’s optimized getting started skills and start building with your preferred code agent.',
                })}
              </EuiText>
              <EuiFlexItem>
                <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                  <EuiButton
                    iconSide="left"
                    iconType="code"
                    onClick={handleOpenInClaudeCli}
                    data-test-subj="agentInstallLaunchBtn"
                    color="text"
                  >
                    {i18n.translate('xpack.gettingStarted.agentInstall.userLLM.cta', {
                      defaultMessage: 'Install Elastic skills',
                    })}
                  </EuiButton>
                  <EuiIcon
                    color="subdued"
                    size="m"
                    title={i18n.translate('xpack.gettingStarted.agentInstall.anthropicIcon.title', {
                      defaultMessage: 'Anthropic Claude Code logo',
                    })}
                    type={anthropicIcon}
                  />
                  <EuiIcon
                    color="subdued"
                    size="m"
                    title={i18n.translate('xpack.gettingStarted.agentInstall.cursorIcon.title', {
                      defaultMessage: 'Cursor AI logo',
                    })}
                    type={cursorIcon}
                  />
                  <EuiIcon
                    color="subdued"
                    size="m"
                    title={i18n.translate('xpack.gettingStarted.agentInstall.vsCodeIcon.title', {
                      defaultMessage: 'Visual Studio Code logo',
                    })}
                    type={vsCodeIcon}
                  />
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        {services.agentBuilder ? (
          <>
            <EuiFlexItem>
              <EuiPanel color="subdued" hasShadow={false}>
                <EuiFlexGroup direction="column">
                  <EuiTitle size="xs">
                    <h5>
                      {i18n.translate('xpack.gettingStarted.agentInstall.elasticAgent.title', {
                        defaultMessage: 'Elastic Agent',
                      })}
                    </h5>
                  </EuiTitle>
                  <EuiText size="xs">
                    {i18n.translate('xpack.gettingStarted.agentInstall.elasticAgent.description', {
                      defaultMessage:
                        'Let our agent guide you through getting data in, setting up your index and running queries.',
                    })}
                  </EuiText>
                  <EuiFlexItem>
                    <EuiFlexGroup direction="row" gutterSize="s">
                      <AiButton
                        iconType="productAgent"
                        variant="outlined"
                        onClick={handleOpenInAgentBuilder}
                        data-test-subj="agentInstallOpenInAgentBuilder"
                      >
                        {i18n.translate('xpack.gettingStarted.agentInstall.elasticAgent.cta', {
                          defaultMessage: 'Open Elastic Agent',
                        })}
                      </AiButton>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </>
        ) : null}
      </EuiFlexGroup>
      {isPromptModalOpen && <PromptModal prompt={modalPrompt} onClose={closePromptModal} />}
    </>
  );
};
