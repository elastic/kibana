/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClientMessage, GetAssistantMessages } from '@kbn/elastic-assistant';
import { EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';

import { AssistantAvatar } from '@kbn/ai-assistant-icon';
import type { Replacements } from '@kbn/elastic-assistant-common';
import {
  getCurrentConversationOwner,
  replaceAnonymizedValuesWithOriginalValues,
} from '@kbn/elastic-assistant-common';
import styled from '@emotion/styled';
import type { EuiPanelProps } from '@elastic/eui/src/components/panel';
import type { ResumeGraphFunction } from '@kbn/elastic-assistant/impl/assistant_context/types';
import { SecurityUserAvatar, SecurityUserName } from './user_avatar';
import { StreamComment } from './stream';
import * as i18n from './translations';

// Matches EuiAvatar L
const SpinnerWrapper = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  justify-content: center;
`;

export interface ContentMessage extends ClientMessage {
  content: string;
}
const transformMessageWithReplacements = ({
  message,
  content,
  showAnonymizedValues,
  replacements,
}: {
  message: ClientMessage;
  content: string;
  showAnonymizedValues: boolean;
  replacements: Replacements;
}): ContentMessage => {
  return {
    ...message,
    content: showAnonymizedValues
      ? content
      : replaceAnonymizedValuesWithOriginalValues({
          messageContent: content,
          replacements,
        }),
  };
};

type GetComments = (args: {
  CommentActions: React.FC<{ message: ClientMessage }>;
}) => GetAssistantMessages;

export const getComments: GetComments =
  (args) =>
  ({
    abortStream,
    contentReferencesVisible,
    currentConversation,
    isConversationOwner,
    isFetchingResponse,
    refetchCurrentConversation,
    regenerateMessage,
    setIsStreaming,
    showAnonymizedValues,
    systemPromptContent,
  }) => {
    if (!currentConversation) return [];

    const mockResumeGraph: ResumeGraphFunction = (threadId, resumeValue) => Promise.resolve(); // TODO: Replace with actual implementation

    const regenerateMessageOfConversation = () => {
      regenerateMessage(currentConversation.id);
    };

    const extraLoadingComment = isFetchingResponse
      ? [
          {
            username: i18n.ASSISTANT,
            timelineAvatar: (
              <SpinnerWrapper>
                <EuiLoadingSpinner size="xl" />
              </SpinnerWrapper>
            ),
            timestamp: '...',
            children: (
              <StreamComment
                abortStream={abortStream}
                content=""
                refetchCurrentConversation={refetchCurrentConversation}
                regenerateMessage={regenerateMessageOfConversation}
                setIsStreaming={setIsStreaming}
                contentReferencesVisible={contentReferencesVisible}
                transformMessage={() => ({ content: '' } as unknown as ContentMessage)}
                resumeGraph={mockResumeGraph}
                isLastInConversation={true}
                contentReferences={null}
                messageRole="assistant"
                isFetching
                // we never need to append to a code block in the loading comment, which is what this index is used for
                index={999}
              />
            ),
          },
        ]
      : [];

    return [
      ...(systemPromptContent && currentConversation.messages.length
        ? [
            {
              username: i18n.SYSTEM,
              timelineAvatar: <AssistantAvatar name="machine" size="l" color="subdued" />,
              timestamp:
                currentConversation.messages[0].timestamp.length === 0
                  ? new Date().toLocaleString()
                  : new Date(currentConversation.messages[0].timestamp).toLocaleString(),
              children: (
                <StreamComment
                  abortStream={abortStream}
                  content={systemPromptContent}
                  refetchCurrentConversation={refetchCurrentConversation}
                  regenerateMessage={regenerateMessageOfConversation}
                  setIsStreaming={setIsStreaming}
                  resumeGraph={mockResumeGraph}
                  contentReferences={null}
                  contentReferencesVisible={contentReferencesVisible}
                  transformMessage={() => ({ content: '' } as unknown as ContentMessage)}
                  messageRole={'assistant'}
                  isLastInConversation={currentConversation.messages.length === 0}
                  // we never need to append to a code block in the system comment, which is what this index is used for
                  index={999}
                />
              ),
            },
          ]
        : []),
      ...currentConversation.messages.map((message, index, total) => {
        const isLastInConversation = index === total.length - 1 && extraLoadingComment.length === 0;
        const isUser = message.role === 'user';
        const replacements = currentConversation.replacements;
        const user = isUser
          ? message.user ?? getCurrentConversationOwner(currentConversation)
          : undefined;
        const messageProps = {
          timelineAvatar: isUser ? (
            <SecurityUserAvatar user={user} />
          ) : (
            <AssistantAvatar name="machine" size="l" color="subdued" />
          ),
          timestamp: i18n.AT(
            message.timestamp.length === 0
              ? new Date().toLocaleString()
              : new Date(message.timestamp).toLocaleString()
          ),
          username: isUser ? <SecurityUserName user={user} /> : i18n.ASSISTANT,
          eventColor: message.isError ? ('danger' as EuiPanelProps['color']) : undefined,
        };

        const isControlsEnabled = isLastInConversation && !isUser && isConversationOwner;

        const transformMessage = (content: string) =>
          transformMessageWithReplacements({
            message,
            content,
            showAnonymizedValues,
            replacements,
          });

        // message still needs to stream, no actions returned and replacements handled by streamer
        if (!(message.content && message.content.length)) {
          return {
            ...messageProps,
            children: (
              <StreamComment
                abortStream={abortStream}
                contentReferences={null}
                contentReferencesVisible={contentReferencesVisible}
                index={index}
                resumeGraph={mockResumeGraph}
                isLastInConversation={isLastInConversation}
                isControlsEnabled={isControlsEnabled}
                isError={message.isError}
                reader={message.reader}
                refetchCurrentConversation={refetchCurrentConversation}
                regenerateMessage={regenerateMessageOfConversation}
                setIsStreaming={setIsStreaming}
                transformMessage={transformMessage}
                messageRole={message.role}
              />
            ),
          };
        }

        // transform message here so we can send correct message to CommentActions
        const transformedMessage = transformMessage(message.content ?? '');

        return {
          ...messageProps,
          actions: <args.CommentActions message={transformedMessage} />,
          children: (
            <StreamComment
              abortStream={abortStream}
              content={transformedMessage.content}
              contentReferences={message.metadata?.contentReferences}
              contentReferencesVisible={contentReferencesVisible}
              interruptValue={message.metadata?.interruptValue}
              interruptResumeValue={message.metadata?.interruptResumeValue}
              index={index}
              resumeGraph={mockResumeGraph}
              isLastInConversation={isLastInConversation}
              isControlsEnabled={isControlsEnabled}
              isError={message.isError}
              // reader is used to determine if streaming controls are shown
              reader={transformedMessage.reader}
              regenerateMessage={regenerateMessageOfConversation}
              refetchCurrentConversation={refetchCurrentConversation}
              setIsStreaming={setIsStreaming}
              transformMessage={transformMessage}
              messageRole={message.role}
            />
          ),
        };
      }),
      ...extraLoadingComment,
    ];
  };
