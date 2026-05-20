/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { buildPrompt } from '../agent_install/util';
import { PromptModal } from '../agent_install/prompt_modal';

export const GettingStartedAgentPrompt = () => {
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [modalPrompt, setModalPrompt] = useState('');
  const handleOpenInAgentWorkflow = useCallback(() => {
    const prompt = buildPrompt('cli');
    // Show a modal with the Claude/CLI prompt for the selected use case
    setIsPromptModalOpen(true);
    setModalPrompt(prompt);
  }, []);
  const closePromptModal = useCallback(() => setIsPromptModalOpen(false), []);

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h5>
              {i18n.translate('xpack.search.gettingStarted.chat.agentPrompt.title', {
                defaultMessage: 'Prompt your agent',
              })}
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued" size="xs">
            <p>
              {i18n.translate('xpack.search.gettingStarted.chat.agentPrompt.description', {
                defaultMessage:
                  'Setup our official optimized Elasticsearch skills in your preferred agentic code workflow.',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiSpacer size="s" />
        <EuiFlexItem>
          <span>
            <EuiButton
              color="text"
              onClick={handleOpenInAgentWorkflow}
              iconType="copy"
              size="s"
              data-test-subj="chatFirstAgentInstallBtn"
            >
              {i18n.translate('xpack.search.gettingStarted.chat.agentPrompt.cta', {
                defaultMessage: 'Copy prompt',
              })}
            </EuiButton>
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isPromptModalOpen && <PromptModal prompt={modalPrompt} onClose={closePromptModal} />}
    </>
  );
};
