/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
  EuiSuperSelect,
  EuiButton,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { elasticsearchOnboardingAgent } from '@kbn/search-agent';

import { useKibana } from '../../hooks/use_kibana';
import { SearchGettingStartedSectionHeading } from '../section_heading';
import { PromptModal } from './prompt_modal';
import { USE_CASE_OPTIONS, type UseCaseId } from './constants';
import { buildPrompt } from './util';

const selectOptions = USE_CASE_OPTIONS.map((option) => ({
  value: option.id,
  inputDisplay: option.label,
  'data-test-subj': `useCase-option-${option.id}`,
}));

export const AgentInstallSection = () => {
  const { services } = useKibana();
  const [selectedUseCase, setSelectedUseCase] = useState<UseCaseId>('general-search');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [modalPrompt, setModalPrompt] = useState('');

  const cursorDeeplinkUrl = useMemo(
    () =>
      `cursor://anysphere.cursor-deeplink/prompt?text=${encodeURIComponent(
        buildPrompt(selectedUseCase, 'cursor')
      )}`,
    [selectedUseCase]
  );

  const togglePopover = useCallback(() => setIsPopoverOpen((open) => !open), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const closePromptModal = useCallback(() => setIsPromptModalOpen(false), []);

  const handleOpenInCursor = useCallback(() => {
    closePopover();
    window.open(cursorDeeplinkUrl, '_blank');
  }, [cursorDeeplinkUrl, closePopover]);

  const handleOpenInClaudeCli = useCallback(() => {
    closePopover();
    const prompt = buildPrompt(selectedUseCase, 'cli');
    // Show a modal with the Claude/CLI prompt for the selected use case
    setIsPromptModalOpen(true);
    setModalPrompt(prompt);
  }, [selectedUseCase, closePopover]);

  const handleOpenInAgentBuilder = useCallback(() => {
    closePopover();
    services.agentBuilder?.openChat({
      agentId: elasticsearchOnboardingAgent.id,
      initialMessage: buildPrompt(selectedUseCase, 'agent-builder'),
      autoSendInitialMessage: false,
      newConversation: true,
      sessionTag: 'search-getting-started',
    });
  }, [closePopover, selectedUseCase, services.agentBuilder]);

  return (
    <>
      <SearchGettingStartedSectionHeading
        icon="sparkles"
        title={i18n.translate('xpack.gettingStarted.agentInstall.title', {
          defaultMessage: 'Build search with your AI assistant',
        })}
        description={i18n.translate('xpack.gettingStarted.agentInstall.description', {
          defaultMessage:
            'Install the Elasticsearch assistant into your LLM environment to get AI-powered help with building your search application.',
        })}
      />
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText>
            <p>
              {i18n.translate('xpack.gettingStarted.agentInstall.useCaseDescription', {
                defaultMessage: 'Have a specific use case in mind?',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperSelect<UseCaseId>
            options={selectOptions}
            valueOfSelected={selectedUseCase}
            onChange={setSelectedUseCase}
            aria-label={i18n.translate('xpack.gettingStarted.agentInstall.useCaseSelectLabel', {
              defaultMessage: 'Select a use case',
            })}
            data-test-subj="agentInstallUseCaseSelect"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiButton
                iconType="arrowDown"
                iconSide="right"
                onClick={togglePopover}
                data-test-subj="agentInstallLaunchBtn"
              >
                {i18n.translate('xpack.gettingStarted.agentInstall.launchButton', {
                  defaultMessage: 'Open in...',
                })}
              </EuiButton>
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="downLeft"
            data-test-subj="agentInstallLaunchPopover"
            aria-label={i18n.translate('xpack.gettingStarted.agentInstall.agentInstallPopover', {
              defaultMessage:
                'Select which agent to use for AI-powered help with building your search application',
            })}
          >
            <EuiContextMenuPanel
              data-test-subj="agentInstallLaunchMenu"
              items={[
                <EuiContextMenuItem
                  key="cursor"
                  icon="launch"
                  onClick={handleOpenInCursor}
                  data-test-subj="agentInstallOpenInCursor"
                >
                  {i18n.translate('xpack.gettingStarted.agentInstall.menuCursor', {
                    defaultMessage: 'Cursor',
                  })}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="claude-cli"
                  icon="console"
                  onClick={handleOpenInClaudeCli}
                  data-test-subj="agentInstallOpenInClaudeCli"
                >
                  {i18n.translate('xpack.gettingStarted.agentInstall.menuClaudeCli', {
                    defaultMessage: 'Claude / CLI',
                  })}
                </EuiContextMenuItem>,
                ...(services.agentBuilder
                  ? [
                      <EuiContextMenuItem
                        key="agent-builder"
                        icon="wrench"
                        onClick={handleOpenInAgentBuilder}
                        data-test-subj="agentInstallOpenInAgentBuilder"
                      >
                        {i18n.translate('xpack.gettingStarted.agentInstall.menuAgentBuilder', {
                          defaultMessage: 'Kibana Agent Builder',
                        })}
                      </EuiContextMenuItem>,
                    ]
                  : []),
              ]}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isPromptModalOpen && <PromptModal prompt={modalPrompt} onClose={closePromptModal} />}
    </>
  );
};
