/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
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
    width: 600px;
  `;

  return (
    <div css={outerStyles}>
      <div css={listStyles}>
        {templatedConversations.map((conversation) => (
          <EuiPanel
            key={conversation.id}
            hasBorder
            onClick={() =>
              agentBuilder?.openConversationMetadata({ conversationId: conversation.id })
            }
            data-test-subj="searchHomepageConversationItem"
          >
            <EuiText size="m">
              {i18n.translate(
                'xpack.searchHomepage.conversationsList.p.theInfamousBriefCardLabel',
                { defaultMessage: 'The infamous brief card' }
              )}
            </EuiText>
            <EuiText size="s">
              {i18n.translate('xpack.searchHomepage.conversationsList.conversationIDTextLabel', {
                defaultMessage: 'Conversation ID:',
              })}
              {conversation.id}
            </EuiText>
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.searchHomepage.conversationsList.p.typeLabel"
                  defaultMessage="type:"
                />
                {conversation.template_id}
              </p>
            </EuiText>
          </EuiPanel>
        ))}
      </div>
    </div>
  );
};
