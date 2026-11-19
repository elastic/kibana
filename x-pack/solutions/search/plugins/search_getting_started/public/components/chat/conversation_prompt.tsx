/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonIcon, EuiToolTip, keys } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConversationInputShell } from '@kbn/agent-builder-plugin/public';

import { AnalyticsEvents } from '../../analytics/constants';
import { useUsageTracker } from '../../contexts/usage_tracker_context';
import { useOpenAgentBuilder } from '../../hooks/use_open_agent_builder';
import { NewConversationTextArea, NewConversationSendButton } from './styles';

export const ConversationPrompt = () => {
  const openAgentBuilder = useOpenAgentBuilder();
  const usageTracker = useUsageTracker();
  const [initialMessage, setInitialMessage] = useState<string>('');
  const openConversation = () => {
    if (initialMessage.trim().length === 0) return;
    usageTracker.click(AnalyticsEvents.startChat);
    openAgentBuilder(initialMessage);
  };
  const onInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === keys.ENTER && !event.shiftKey) {
      event.preventDefault();

      openConversation();
    }
  };

  return (
    <ConversationInputShell>
      <textarea
        css={NewConversationTextArea}
        name="searchGettingStartedChatPromptInput"
        data-test-subj="searchGettingStartedChatPromptInput"
        placeholder={i18n.translate(
          'xpack.searchGettingStarted.chat.conversationPrompt.placeholder',
          { defaultMessage: 'How can I help you get started today?' }
        )}
        aria-label={i18n.translate(
          'xpack.searchGettingStarted.chat.conversationPrompt.input.aria',
          {
            defaultMessage: 'Ask the AI assistant a question to get started',
          }
        )}
        rows={3}
        value={initialMessage}
        onChange={(e) => setInitialMessage(e.currentTarget.value)}
        onKeyDown={onInputKeyDown}
      />
      <div css={NewConversationSendButton}>
        <EuiToolTip
          content={i18n.translate(
            'xpack.searchGettingStarted.chat.conversationPrompt.send.tooltip',
            {
              defaultMessage: 'Open the AI assistant chat',
            }
          )}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            iconType="kqlFunction"
            display="fill"
            size="m"
            disabled={initialMessage.trim().length === 0}
            onClick={openConversation}
            aria-label={i18n.translate('xpack.searchGettingStarted.chat.conversationPrompt.send', {
              defaultMessage: 'Open the AI assistant chat',
            })}
            data-test-subj="searchGettingStartedChatPromptSend"
          />
        </EuiToolTip>
      </div>
    </ConversationInputShell>
  );
};
