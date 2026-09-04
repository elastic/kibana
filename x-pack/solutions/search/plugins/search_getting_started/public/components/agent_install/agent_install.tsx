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
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';

import { anthropicIcon, cursorIcon, visualStudioCodeIcon } from '@kbn/custom-icons';

import { useKibana } from '../../hooks/use_kibana';
import { PromptModal } from './prompt_modal';
import { CliInstallModal } from './cli_install_modal';
import { buildPrompt } from './util';
import { AgentBuilderPanelContainer, AgentInstallPanelContainer, brandIcon } from './styles';
import { useUsageTracker } from '../../contexts/usage_tracker_context';
import { AnalyticsEvents } from '../../analytics/constants';

const BrandIcon: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
  <span role="img" aria-label={title} css={brandIcon(icon)} />
);

const AgentInstallPanel: React.FC<{
  icon: string;
  title: React.ReactNode;
  description: string;
  children: React.ReactNode;
}> = ({ icon, title, description, children }) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexStart" direction="column">
      <EuiFlexItem grow={false}>
        <EuiPanel color="subdued" paddingSize="s" grow={false}>
          <EuiIcon color="subdued" size="m" type={icon} aria-hidden />
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
  const [isCliModalOpen, setIsCliModalOpen] = useState(false);
  const [modalPrompt, setModalPrompt] = useState('');
  const usageTracker = useUsageTracker();

  const closePromptModal = useCallback(() => setIsPromptModalOpen(false), []);
  const closeCliModal = useCallback(() => setIsCliModalOpen(false), []);

  const handleOpenInClaudeCli = useCallback(() => {
    const prompt = buildPrompt('cli');
    // Show a modal with the Claude/CLI prompt for the selected use case
    setIsPromptModalOpen(true);
    setModalPrompt(prompt);
  }, []);

  const handleInstallCli = useCallback(() => {
    usageTracker.click(AnalyticsEvents.cliInstallModalOpened);
    setIsCliModalOpen(true);
  }, [usageTracker]);

  const handleOpenInAgentBuilder = useCallback(() => {
    usageTracker.click(AnalyticsEvents.agentBuilderOpened);
    services.agentBuilder?.openChat({
      initialMessage: buildPrompt('agent-builder'),
      autoSendInitialMessage: true,
      newConversation: true,
      sessionTag: 'search-getting-started',
    });
  }, [services.agentBuilder, usageTracker]);

  return (
    <>
      <EuiPanel color="plain" hasShadow={true} paddingSize="none">
        <EuiFlexGroup gutterSize="m" alignItems="stretch" direction="row">
          <EuiFlexItem>
            <EuiPanel color="transparent" paddingSize="l">
              <AgentInstallPanel
                icon="code"
                title={i18n.translate('xpack.searchGettingStarted.agentInstall.ide.title', {
                  defaultMessage: 'Prompt your agent',
                })}
                description={i18n.translate(
                  'xpack.searchGettingStarted.agentInstall.ide.description',
                  {
                    defaultMessage: 'Code with context using Elastic-certified skills.',
                  }
                )}
              >
                <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      onClick={handleOpenInClaudeCli}
                      data-test-subj="agentInstallLaunchBtn"
                      color="text"
                    >
                      {i18n.translate('xpack.searchGettingStarted.agentInstall.userLLM.cta', {
                        defaultMessage: 'View prompt',
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
                        <BrandIcon
                          icon={anthropicIcon}
                          title={i18n.translate(
                            'xpack.searchGettingStarted.agentInstall.anthropicIcon.title',
                            {
                              defaultMessage: 'Anthropic Claude Code logo',
                            }
                          )}
                        />
                      </EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <BrandIcon
                          icon={cursorIcon}
                          title={i18n.translate(
                            'xpack.searchGettingStarted.agentInstall.cursorIcon.title',
                            {
                              defaultMessage: 'Cursor AI logo',
                            }
                          )}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <BrandIcon
                          icon={visualStudioCodeIcon}
                          title={i18n.translate(
                            'xpack.searchGettingStarted.agentInstall.vsCodeIcon.title',
                            {
                              defaultMessage: 'Visual Studio Code logo',
                            }
                          )}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </AgentInstallPanel>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem css={AgentInstallPanelContainer}>
            <EuiPanel color="transparent" paddingSize="l">
              <AgentInstallPanel
                icon="commandLine"
                title={
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      {i18n.translate('xpack.searchGettingStarted.agentInstall.cli.title', {
                        defaultMessage: 'Build from your terminal',
                      })}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="accent" fill data-test-subj="agentInstallCliNewBadge">
                        {i18n.translate('xpack.searchGettingStarted.agentInstall.cli.newBadge', {
                          defaultMessage: 'New',
                        })}
                      </EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                description={i18n.translate(
                  'xpack.searchGettingStarted.agentInstall.cli.description',
                  {
                    defaultMessage: 'Query and manage this project with the Elastic CLI.',
                  }
                )}
              >
                <EuiButton
                  color="text"
                  onClick={handleInstallCli}
                  data-test-subj="agentInstallInstallCli"
                >
                  {i18n.translate('xpack.searchGettingStarted.agentInstall.cli.cta', {
                    defaultMessage: 'Install the CLI',
                  })}
                </EuiButton>
              </AgentInstallPanel>
            </EuiPanel>
          </EuiFlexItem>

          {services.agentBuilder ? (
            <EuiFlexItem css={AgentBuilderPanelContainer}>
              <EuiPanel color="transparent" paddingSize="l">
                <AgentInstallPanel
                  icon="productAgent"
                  title={i18n.translate(
                    'xpack.searchGettingStarted.agentInstall.agentBuilder.title',
                    {
                      defaultMessage: 'Build with the Elastic AI Agent',
                    }
                  )}
                  description={i18n.translate(
                    'xpack.searchGettingStarted.agentInstall.agentBuilder.description',
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
                    {i18n.translate('xpack.searchGettingStarted.agentInstall.agentBuilder.cta', {
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
      {isCliModalOpen && <CliInstallModal onClose={closeCliModal} />}
    </>
  );
};
