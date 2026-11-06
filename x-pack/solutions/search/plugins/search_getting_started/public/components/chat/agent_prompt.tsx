/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { buildPrompt } from '../agent_install/util';
import { PromptModal } from '../agent_install/prompt_modal';

export const GettingStartedAgentPrompt = () => {
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h5>
              {i18n.translate('xpack.searchGettingStarted.chat.agentPrompt.title', {
                defaultMessage: 'Prompt your agent',
              })}
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued" size="xs">
            <p>
              {i18n.translate('xpack.searchGettingStarted.chat.agentPrompt.description', {
                defaultMessage:
                  'Set up our official optimized Elasticsearch skills in your preferred agentic code workflow.',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiSpacer size="s" />
        <EuiFlexItem>
          <span>
            <EuiButton
              color="text"
              onClick={() => setIsPromptModalOpen(true)}
              iconType="copy"
              size="s"
              data-test-subj="chatFirstAgentInstallBtn"
            >
              {i18n.translate('xpack.searchGettingStarted.chat.agentPrompt.cta', {
                defaultMessage: 'Copy prompt',
              })}
            </EuiButton>
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isPromptModalOpen && (
        <PromptModal prompt={buildPrompt('cli')} onClose={() => setIsPromptModalOpen(false)} />
      )}
    </>
  );
};
