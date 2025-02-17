/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClientMessage, GetAssistantMessages } from '@kbn/elastic-assistant';
import { EuiAvatar, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';

import { AssistantAvatar } from '@kbn/ai-assistant-icon';
import type { Replacements } from '@kbn/elastic-assistant-common';
import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';
import styled from '@emotion/styled';
import type { EuiPanelProps } from '@elastic/eui/src/components/panel';
import { StreamComment } from './stream';
import { CommentActions } from '../comment_actions';
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

export const getComments: GetAssistantMessages = ({
  abortStream,
  currentConversation,
  isFetchingResponse,
  refetchCurrentConversation,
  regenerateMessage,
  showAnonymizedValues,
  currentUserAvatar,
  setIsStreaming,
  systemPromptContent,
  contentReferencesVisible,
  contentReferencesEnabled,
}) => {
  if (!currentConversation) return [];

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
              transformMessage={() => ({ content: '' } as unknown as ContentMessage)}
              contentReferences={null}
              isFetching
              // we never need to append to a code block in the loading comment, which is what this index is used for
              index={999}
            />
          ),
        },
      ]
    : [];

  const UserAvatar = () => {
    if (currentUserAvatar) {
      return (
        <EuiAvatar
          name="user"
          size="l"
          color={currentUserAvatar?.color ?? 'subdued'}
          {...(currentUserAvatar?.imageUrl
            ? { imageUrl: currentUserAvatar.imageUrl as string }
            : { initials: currentUserAvatar?.initials })}
        />
      );
    }

    return <EuiAvatar name="user" size="l" color="subdued" iconType="userAvatar" />;
  };

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
                contentReferences={null}
                transformMessage={() => ({ content: '' } as unknown as ContentMessage)}
                // we never need to append to a code block in the system comment, which is what this index is used for
                index={999}
              />
            ),
          },
        ]
      : []),
    ...currentConversation.messages.map((message, index) => {
      const isLastComment = index === currentConversation.messages.length - 1;
      const isUser = message.role === 'user';
      const replacements = currentConversation.replacements;

      const messageProps = {
        timelineAvatar: isUser ? (
          <UserAvatar />
        ) : (
          <AssistantAvatar name="machine" size="l" color="subdued" />
        ),
        timestamp: i18n.AT(
          message.timestamp.length === 0
            ? new Date().toLocaleString()
            : new Date(message.timestamp).toLocaleString()
        ),
        username: isUser ? i18n.YOU : i18n.ASSISTANT,
        eventColor: message.isError ? ('danger' as EuiPanelProps['color']) : undefined,
      };

      const isControlsEnabled = isLastComment && !isUser;

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
              contentReferencesEnabled={contentReferencesEnabled}
              index={index}
              isControlsEnabled={isControlsEnabled}
              isError={message.isError}
              reader={message.reader}
              refetchCurrentConversation={refetchCurrentConversation}
              regenerateMessage={regenerateMessageOfConversation}
              setIsStreaming={setIsStreaming}
              transformMessage={transformMessage}
            />
          ),
        };
      }

      // transform message here so we can send correct message to CommentActions
      const transformedMessage = transformMessage(message.content ?? '');

      return {
        ...messageProps,
        actions: <CommentActions message={transformedMessage} />,
        children: (
          <StreamComment
            abortStream={abortStream}
            content={transformedMessage.content}
            contentReferences={message.metadata?.contentReferences}
            contentReferencesVisible={contentReferencesVisible}
            contentReferencesEnabled={contentReferencesEnabled}
            index={index}
            isControlsEnabled={isControlsEnabled}
            isError={message.isError}
            // reader is used to determine if streaming controls are shown
            reader={transformedMessage.reader}
            regenerateMessage={regenerateMessageOfConversation}
            refetchCurrentConversation={refetchCurrentConversation}
            setIsStreaming={setIsStreaming}
            transformMessage={transformMessage}
          />
        ),
      };
    }),
    ...extraLoadingComment,
  ];
};
