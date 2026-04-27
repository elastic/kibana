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
import { AiButton } from '@kbn/shared-ux-ai-components';

import anthropicIcon from '../../assets/anthropic.svg';
import cursorIcon from '../../assets/cursor.svg';
import vsCodeIcon from '../../assets/visual-studio-code.svg';

import { useKibana } from '../../hooks/use_kibana';
import { PromptModal } from './prompt_modal';
import { buildPrompt } from './util';
import { AgentBuilderPanelContainer } from './styles';

const AgentInstallPanel: React.FC<{
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ icon, title, description, children }) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexStart" direction="column">
      <EuiFlexItem grow={false}>
        <EuiPanel color="subdued" paddingSize="s" grow={false}>
          <EuiIcon color="subdued" size="m" type={icon} title={title} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h5>{title}</h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>{description}</p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

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
              <AgentInstallPanel
                icon="commandLine"
                title={i18n.translate('xpack.gettingStarted.agentInstall.ide.title', {
                  defaultMessage: 'Build in your IDE',
                })}
                description={i18n.translate('xpack.gettingStarted.agentInstall.ide.description', {
                  defaultMessage: 'Code with context using Elastic-certified skills.',
                })}
              >
                <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      onClick={handleOpenInClaudeCli}
                      data-test-subj="agentInstallLaunchBtn"
                      color="primary"
                      fill
                    >
                      {i18n.translate('xpack.gettingStarted.agentInstall.userLLM.cta', {
                        defaultMessage: 'Copy prompt',
                      })}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup
                      direction="row"
                      gutterSize="s"
                      alignItems="center"
                      responsive={false}
                    >
                      <EuiFlexItem grow={false}>
                        <EuiIcon
                          color="subdued"
                          size="m"
                          title={i18n.translate(
                            'xpack.gettingStarted.agentInstall.anthropicIcon.title',
                            {
                              defaultMessage: 'Anthropic Claude Code logo',
                            }
                          )}
                          type={anthropicIcon}
                        />
                      </EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <EuiIcon
                          color="subdued"
                          size="m"
                          title={i18n.translate(
                            'xpack.gettingStarted.agentInstall.cursorIcon.title',
                            {
                              defaultMessage: 'Cursor AI logo',
                            }
                          )}
                          type={cursorIcon}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiIcon
                          color="subdued"
                          size="m"
                          title={i18n.translate(
                            'xpack.gettingStarted.agentInstall.vsCodeIcon.title',
                            {
                              defaultMessage: 'Visual Studio Code logo',
                            }
                          )}
                          type={vsCodeIcon}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </AgentInstallPanel>
            </EuiPanel>
          </EuiFlexItem>
          {services.agentBuilder ? (
            <EuiFlexItem css={AgentBuilderPanelContainer}>
              <EuiPanel color="transparent" paddingSize="l">
                <AgentInstallPanel
                  icon="productAgent"
                  title={i18n.translate('xpack.gettingStarted.agentInstall.agentBuilder.title', {
                    defaultMessage: 'Build with the Elastic AI Agent',
                  })}
                  description={i18n.translate(
                    'xpack.gettingStarted.agentInstall.agentBuilder.description',
                    {
                      defaultMessage: 'Chat directly with our built-in agentic assistant.',
                    }
                  )}
                >
                  <AiButton
                    variant="outlined"
                    onClick={handleOpenInAgentBuilder}
                    data-test-subj="agentInstallOpenInAgentBuilder"
                  >
                    {i18n.translate('xpack.gettingStarted.agentInstall.agentBuilder.cta', {
                      defaultMessage: 'Open Elastic AI Agent',
                    })}
                  </AiButton>
                </AgentInstallPanel>
              </EuiPanel>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiPanel>
      {isPromptModalOpen && <PromptModal prompt={modalPrompt} onClose={closePromptModal} />}
    </>
  );
};
