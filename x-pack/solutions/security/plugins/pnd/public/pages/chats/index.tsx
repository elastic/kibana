/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiEmptyPrompt, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { useHistory } from 'react-router-dom';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import * as i18n from './translations';

export const ChatsPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const { services } = useKibana<{ agentBuilder?: AgentBuilderPluginStart }>();
  const { agentBuilder } = services;
  usePndDocTitle(i18n.PAGE_TITLE);

  const onClose = useCallback(() => {
    history.push('/');
  }, [history]);

  if (!agentBuilder) {
    return (
      <EuiEmptyPrompt
        iconType="discuss"
        title={<h2>{i18n.PAGE_TITLE}</h2>}
        body={<p>{i18n.AGENT_BUILDER_UNAVAILABLE}</p>}
      />
    );
  }

  const { EmbeddableConversation } = agentBuilder;

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        height: 100%;
        overflow: hidden;
        background: ${euiTheme.colors.body};
      `}
      data-test-subj="pndChatsAgentBuilder"
    >
      <React.Suspense
        fallback={
          <div
            css={css`
              display: flex;
              flex: 1;
              align-items: center;
              justify-content: center;
            `}
          >
            <EuiLoadingSpinner size="xl" aria-label={i18n.LOADING} />
          </div>
        }
      >
        <EmbeddableConversation
          agentId={agentBuilderDefaultAgentId}
          sessionTag="pnd"
          greetingMessage={i18n.GREETING}
          ariaLabelledBy="pnd-chats-agent-builder"
          onClose={onClose}
        />
      </React.Suspense>
    </div>
  );
};
