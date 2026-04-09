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
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';

import anthropicIcon from '../../assets/anthropic.svg';
import cursorIcon from '../../assets/cursor.svg';
import vsCodeIcon from '../../assets/visual-studio-code.svg';

import { useKibana } from '../../hooks/use_kibana';
import { SearchGettingStartedSectionHeading } from '../section_heading';
import { PromptModal } from './prompt_modal';
import { buildPrompt } from './util';

export const AgentInstallSection = () => {
  const { euiTheme } = useEuiTheme();
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
      initialMessage: buildPrompt('agent-builder'),
      autoSendInitialMessage: true,
      newConversation: true,
      sessionTag: 'search-getting-started',
    });
  }, [services.agentBuilder]);

  return (
    <>
      <EuiPanel color="plain" hasShadow={true} paddingSize="none">
        <EuiFlexGroup gutterSize="m" alignItems="stretch" direction="row">
          <EuiFlexItem>
            <EuiPanel color="transparent" paddingSize="l">
              <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    color="subdued"
                    size="m"
                    title={i18n.translate('xpack.gettingStarted.agentInstall.anthropicIcon.title', {
                      defaultMessage: 'Anthropic Claude Code logo',
                    })}
                    type={anthropicIcon}
                  />
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiIcon
                    color="subdued"
                    size="m"
                    title={i18n.translate('xpack.gettingStarted.agentInstall.cursorIcon.title', {
                      defaultMessage: 'Cursor AI logo',
                    })}
                    type={cursorIcon}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    color="subdued"
                    size="m"
                    title={i18n.translate('xpack.gettingStarted.agentInstall.vsCodeIcon.title', {
                      defaultMessage: 'Visual Studio Code logo',
                    })}
                    type={vsCodeIcon}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              <EuiTitle size="xs"><h5>{i18n.translate('xpack.gettingStarted.agentInstall.title', {
                defaultMessage: 'Install Elastic Agent skills',
              })}</h5></EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                <p>{i18n.translate('xpack.gettingStarted.agentInstall.description', {
                  defaultMessage: 'Get started in your code prompt of choice with our curated agent skills.',
                })}</p>
              </EuiText>

              <EuiSpacer size="l" />
              <EuiButton
                iconSide="left"
                iconType="code"
                onClick={handleOpenInClaudeCli}
                data-test-subj="agentInstallLaunchBtn"
                color="primary"
                fill
              >
                {i18n.translate('xpack.gettingStarted.agentInstall.userLLM.cta', {
                  defaultMessage: 'Install Elastic skills',
                })}
              </EuiButton>



            </EuiPanel>
          </EuiFlexItem>

          {services.agentBuilder ? (

            <EuiFlexItem css={css`border-left: ${euiTheme.border.thin};`}>
              <EuiPanel color="transparent" paddingSize="l">
                <EuiIcon
                  color="subdued"
                  size="m"
                  type="sparkles"
                />
                <EuiSpacer size="m" />
                <EuiTitle size="xs"><h5>{i18n.translate('xpack.gettingStarted.agentInstall.title', {
                  defaultMessage: 'Elasticsearch Agent',
                })}</h5></EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s" color="subdued">
                  <p>{i18n.translate('xpack.gettingStarted.agentInstall.description', {
                    defaultMessage: 'Skip the setup and start learning and interacting with Elasticsearch right away.',
                  })}</p>
                </EuiText>

                <EuiSpacer size="l" />

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

              </EuiPanel>
            </EuiFlexItem>

          ) : null}
        </EuiFlexGroup>
      </EuiPanel>

      {isPromptModalOpen && <PromptModal prompt={modalPrompt} onClose={closePromptModal} />
      }
    </>
  );
};
