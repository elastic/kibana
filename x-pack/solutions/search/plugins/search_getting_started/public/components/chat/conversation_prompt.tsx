/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useState } from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConversationInputShell } from '@kbn/agent-builder-plugin/public';
import { useKibana } from '../../hooks/use_kibana';

import {
  ConversationOverlayBaseStyles,
  ConversationOverlayOpeningStyle,
  ConversationOverlayOpenStyle,
  ConversationStyle,
  NewConversationTextArea,
  NewConversationSendButton,
  NewConversationContainer,
} from './styles';

const CONVERSATION_ANIMATION_MS = 500; // 500ms euiTheme.animation.extraSlow

enum ConversationPhase {
  Closed = 'closed',
  Opening = 'opening',
  Open = 'open',
  Closing = 'closing',
}

export const ConversationPrompt = () => {
  const {
    services: { agentBuilder },
  } = useKibana();
  const promptLauncherRef = useRef<HTMLDivElement>(null);
  const [launcherRect, setLauncherRect] = useState<DOMRect | null>(null);
  const [chatPhase, setChatPhase] = useState<ConversationPhase>(ConversationPhase.Closed);
  const isOverlayVisible = chatPhase !== ConversationPhase.Closed;
  const isAnimatingToFull = chatPhase === ConversationPhase.Open;
  // agentBuilder === undefined handled by useGettingStartChatEnabled
  const { EmbeddableConversation } = agentBuilder!;

  const expandConversation = useCallback(() => {
    if (chatPhase !== ConversationPhase.Closed) return;
    if (promptLauncherRef.current) {
      setLauncherRect(promptLauncherRef.current.getBoundingClientRect());
    }
    setChatPhase(ConversationPhase.Opening);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setChatPhase(ConversationPhase.Open));
    });
  }, [chatPhase]);
  const collapseConversation = useCallback(() => {
    if (chatPhase !== ConversationPhase.Open) return;
    if (promptLauncherRef.current) {
      setLauncherRect(promptLauncherRef.current.getBoundingClientRect());
    }
    setChatPhase(ConversationPhase.Closing);
    setTimeout(() => {
      setChatPhase(ConversationPhase.Closed);
      setLauncherRect(null);
    }, CONVERSATION_ANIMATION_MS);
  }, [chatPhase]);

  return (
    <>
      <div css={NewConversationContainer}>
        <ConversationInputShell ref={promptLauncherRef} css={NewConversationTextArea}>
          <textarea
            data-test-subj="searchGettingStartedChatPromptInput"
            placeholder={i18n.translate(
              'xpack.search.gettingStarted.chat.conversationPrompt.placeholder',
              { defaultMessage: 'How can I help you get started today?' }
            )}
            aria-label={i18n.translate('xpack.search.gettingStarted.chat.conversationPrompt.aria', {
              defaultMessage: 'Open the AI agent chat',
            })}
            readOnly
            rows={3}
            onFocus={expandConversation}
            onMouseDown={(e) => {
              e.preventDefault();
              expandConversation();
            }}
          />
          <div css={NewConversationSendButton}>
            <EuiButtonIcon
              iconType="kqlFunction"
              display="fill"
              size="m"
              onClick={expandConversation}
              aria-label={i18n.translate(
                'xpack.search.gettingStarted.chat.conversationPrompt.send',
                {
                  defaultMessage: 'Open the AI agent chat',
                }
              )}
              data-test-subj="searchGettingStartedChatPromptSend"
            />
          </div>
        </ConversationInputShell>
      </div>
      {isOverlayVisible ? (
        <div
          css={[
            ConversationOverlayBaseStyles,
            !isAnimatingToFull && launcherRect
              ? ConversationOverlayOpeningStyle(launcherRect)
              : ConversationOverlayOpenStyle,
          ]}
          data-test-subj="searchGettingStartedChatNewConversationOverlay"
        >
          <div css={ConversationStyle(isAnimatingToFull)}>
            {isAnimatingToFull && (
              <EmbeddableConversation
                sessionTag="search-getting-started"
                onClose={collapseConversation}
                ariaLabelledBy="search-getting-started-embeddable-conversation"
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
};
