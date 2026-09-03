/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { anthropicIcon, cursorIcon, visualStudioCodeIcon } from '@kbn/custom-icons';
import { useKibana } from '../hooks/use_kibana';
import { PromptModal } from './prompt_modal';
import { brandIcon } from './chat_with_data_section_styles';

const ADD_SKILLS_PROMPT = [
  'Install the Elastic skills:',
  '`npx skills add elastic/agent-skills`',
  '',
  'Help me get started with my Elastic Vector Database',
].join('\n');

const AGENT_ONBOARDING_MESSAGE = '/elasticsearch-onboarding';

const BRAND_ICONS = [
  {
    key: 'anthropic',
    icon: anthropicIcon,
    title: i18n.translate('xpack.serverlessVectordb.home.chat.anthropicIcon', {
      defaultMessage: 'Anthropic Claude Code logo',
    }),
  },
  {
    key: 'cursor',
    icon: cursorIcon,
    title: i18n.translate('xpack.serverlessVectordb.home.chat.cursorIcon', {
      defaultMessage: 'Cursor AI logo',
    }),
  },
  {
    key: 'vsCode',
    icon: visualStudioCodeIcon,
    title: i18n.translate('xpack.serverlessVectordb.home.chat.vsCodeIcon', {
      defaultMessage: 'Visual Studio Code logo',
    }),
  },
];

export const ChatWithYourDataSection = () => {
  const {
    services: { agentBuilder },
  } = useKibana();
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h2>
            {i18n.translate('xpack.serverlessVectordb.home.chat.title', {
              defaultMessage: 'Build in your IDE',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.serverlessVectordb.home.chat.description', {
              defaultMessage: 'Code with context using Elastic-certified skills.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              color="text"
              onClick={() => setIsPromptModalOpen(true)}
              data-test-subj="viewPromptButton"
              data-telemetry-id="serverlessVectordb-home-chat-viewPrompt"
            >
              {i18n.translate('xpack.serverlessVectordb.home.chat.viewPrompt', {
                defaultMessage: 'View prompt',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              {BRAND_ICONS.map(({ key, icon, title }) => (
                <EuiFlexItem grow={false} key={key}>
                  <span role="img" aria-label={title} css={brandIcon(icon)} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <EuiTitle size="xxs">
          <h2>
            {i18n.translate('xpack.serverlessVectordb.home.chat.skipSetupTitle', {
              defaultMessage: 'Skip the setup and use the Elastic Agent',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <span>
          <AiButton
            variant="outlined"
            iconType="productAgent"
            onClick={() =>
              agentBuilder.openChat({
                initialMessage: AGENT_ONBOARDING_MESSAGE,
                autoSendInitialMessage: true,
                newConversation: true,
                sessionTag: 'vectordb-home',
              })
            }
            data-test-subj="openElasticAgentButton"
            data-telemetry-id="serverlessVectordb-home-chat-openElasticAgent"
          >
            {i18n.translate('xpack.serverlessVectordb.home.chat.openAgent', {
              defaultMessage: 'Chat with AI Agent',
            })}
          </AiButton>
        </span>
        {isPromptModalOpen && (
          <PromptModal prompt={ADD_SKILLS_PROMPT} onClose={() => setIsPromptModalOpen(false)} />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
