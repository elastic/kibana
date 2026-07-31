/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { useConversations } from '../../hooks/api/use_conversations';
import { useKibana } from '../../hooks/use_kibana';

export const ConversationsList = () => {
  const { euiTheme } = useEuiTheme();
  const { conversations } = useConversations();
  const {
    services: { agentBuilder },
  } = useKibana();

  const templatedConversations = conversations.filter((conversation) => conversation.template_id);

  const outerStyles = css`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 70vh;
    width: 100%;
  `;

  const listStyles = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.s};
    width: 800px;
  `;

  return (
    <div css={outerStyles}>
      <div css={listStyles}>
        {agentBuilder &&
          templatedConversations.map((conversation) => (
            <agentBuilder.ConversationBriefCard
              key={conversation.id}
              conversationId={conversation.id}
              type={conversation.template_id ?? ''}
              metadata={conversation.metadata as Record<string, string> | undefined}
              onClick={() =>
                agentBuilder.openConversationMetadata({ conversationId: conversation.id })
              }
            />
          ))}
      </div>
    </div>
  );
};
