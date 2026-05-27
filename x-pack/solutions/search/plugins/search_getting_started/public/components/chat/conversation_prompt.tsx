/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiToolTip, keys } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { ConversationInputShell } from '@kbn/agent-builder-plugin/public';
import { useKibana } from '../../hooks/use_kibana';

import {
  NewConversationTextArea,
  NewConversationSendButton,
  NewConversationContainer,
} from './styles';

export const ConversationPrompt = () => {
  const {
    services: { application },
  } = useKibana();
  const [initialMessage, setInitialMessage] = useState<string>('');
  const openConversation = useCallback(() => {
    if (initialMessage.trim().length === 0) return;
    application.navigateToApp(AGENT_BUILDER_APP_ID, {
      path: `/agents/${agentBuilderDefaultAgentId}/conversations/new`,
      state: {
        initialMessage,
        entryPointSource: 'search_getting_started',
      },
    });
  }, [application, initialMessage]);
  const onInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === keys.ENTER && !event.shiftKey) {
        event.preventDefault();
        openConversation();
      }
    },
    [openConversation]
  );

  return (
    <div css={NewConversationContainer}>
      <ConversationInputShell>
        <textarea
          css={NewConversationTextArea}
          name="searchGettingStartedChatPromptInput"
          data-test-subj="searchGettingStartedChatPromptInput"
          placeholder={i18n.translate(
            'xpack.search.gettingStarted.chat.conversationPrompt.placeholder',
            { defaultMessage: 'How can I help you get started today?' }
          )}
          aria-label={i18n.translate(
            'xpack.search.gettingStarted.chat.conversationPrompt.input.aria',
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
              'xpack.search.gettingStarted.chat.conversationPrompt.send.tooltip',
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
              aria-label={i18n.translate(
                'xpack.search.gettingStarted.chat.conversationPrompt.send',
                {
                  defaultMessage: 'Open the AI assistant chat',
                }
              )}
              data-test-subj="searchGettingStartedChatPromptSend"
            />
          </EuiToolTip>
        </div>
      </ConversationInputShell>
    </div>
  );
};
