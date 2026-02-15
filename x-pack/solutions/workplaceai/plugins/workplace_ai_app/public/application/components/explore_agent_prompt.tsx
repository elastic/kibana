/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import { AGENT_BUILDER_CONVERSATIONS_NEW_PATH } from '../../../common';
import { useKibana } from '../hooks/use_kibana';

const titleStyles = { fontWeight: 400 };

const titleContainerStyles = { width: '100%' };

const fullWidthStyles = css`
  width: 100%;
`;

export const ExploreAgentPrompt: React.FC = () => {
  const {
    services: { application, plugins },
  } = useKibana();

  // Get the embeddable conversation component from Agent Builder plugin
  const EmbeddableConversation = useMemo(
    () => plugins.agentBuilder.getEmbeddableConversationComponent(),
    [plugins.agentBuilder]
  );

  const handleMessageSubmit = (
    message: string,
    context: { agentId?: string; connectorId?: string }
  ) => {
    const searchParams = new URLSearchParams();
    if (context.agentId) {
      searchParams.set('agent_id', context.agentId);
    }
    if (context.connectorId) {
      searchParams.set('source_id', context.connectorId);
    }

    const queryString = searchParams.toString();
    const path = queryString
      ? `${AGENT_BUILDER_CONVERSATIONS_NEW_PATH}?${queryString}`
      : AGENT_BUILDER_CONVERSATIONS_NEW_PATH;

    application.navigateToApp(AGENT_BUILDER_APP_ID, {
      path,
      state: {
        initialMessage: message,
        agentId: context.agentId,
        connectorId: context.connectorId,
      },
    });
  };

  return (
    <EuiFlexGroup
      responsive={false}
      alignItems="flexStart"
      direction="column"
      gutterSize="l"
      data-test-subj="workplaceAIExploreAgentPrompt"
    >
      <EuiFlexItem grow={false} css={titleContainerStyles}>
        <EuiTitle size="m" css={titleStyles}>
          <h2>
            {i18n.translate('xpack.workplaceai.exploreAgentPrompt.title', {
              defaultMessage: 'How can I help you?',
            })}
          </h2>
        </EuiTitle>
      </EuiFlexItem>

      <EuiFlexItem grow={false} css={fullWidthStyles}>
        <EmbeddableConversation
          renderMode="input-only"
          newConversation={true}
          onMessageSubmit={handleMessageSubmit}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
