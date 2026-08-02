/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import * as i18n from '../translations';

/** Tall enough for a few turns without swallowing the list it sits under. */
const CHAT_HEIGHT = '60vh';

/**
 * The general "ask PND" chat, kept as its own thing beside the conversation list.
 *
 * It is a *new* conversation with the default agent, not a way into an existing one:
 * `EmbeddableConversation` takes no `conversationId`, exposes no ref and no conversations service, so
 * it cannot be pointed at a thread. That is what the list above it is for. The PND conversations do
 * appear in this chat's own built-in picker, which the description says out loud so the two surfaces
 * do not read as contradicting each other.
 *
 * Collapsed by default, and its children are only mounted once it is opened: the embed lazy-loads a
 * large bundle, and on this page the list is what the analyst came for.
 */
export const AskPndChat: React.FC = () => {
  const { services } = useKibana<{ agentBuilder?: AgentBuilderPluginStart }>();
  const { agentBuilder } = services;
  const [isOpen, setIsOpen] = useState(false);
  const accordionId = useGeneratedHtmlId({ prefix: 'pndAskPnd' });
  const titleId = useGeneratedHtmlId({ prefix: 'pndAskPndTitle' });

  // the embed's own Close collapses this panel; the old full-page chat navigated away from /chats,
  // which is no longer right now that the page has a list on it
  const onClose = useCallback(() => setIsOpen(false), []);

  if (agentBuilder == null) {
    return (
      <EuiPanel data-test-subj="pndAskPndUnavailable" hasBorder hasShadow={false} paddingSize="m">
        <EuiTitle size="xxs">
          <h2>{i18n.ASK_PND_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText color="subdued" size="xs">
          <p>{i18n.AGENT_BUILDER_UNAVAILABLE}</p>
        </EuiText>
      </EuiPanel>
    );
  }

  const { EmbeddableConversation } = agentBuilder;

  return (
    <EuiPanel data-test-subj="pndAskPnd" hasBorder hasShadow={false} paddingSize="m">
      <EuiTitle size="xxs">
        <h2 id={titleId}>{i18n.ASK_PND_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText color="subdued" data-test-subj="pndAskPndDescription" size="xs">
        <p>{i18n.ASK_PND_DESCRIPTION}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiAccordion
        buttonContent={i18n.ASK_PND_TOGGLE}
        buttonProps={{ 'data-test-subj': 'pndAskPndToggle' }}
        // controlled, so the chat's own Close button collapses the panel rather than doing nothing
        forceState={isOpen ? 'open' : 'closed'}
        id={accordionId}
        onToggle={setIsOpen}
        paddingSize="s"
      >
        {isOpen ? (
          <div
            css={css`
              display: flex;
              flex-direction: column;
              height: ${CHAT_HEIGHT};
              overflow: hidden;
            `}
            data-test-subj="pndChatsAgentBuilder"
          >
            <React.Suspense
              fallback={
                <div
                  css={css`
                    align-items: center;
                    display: flex;
                    flex: 1;
                    justify-content: center;
                  `}
                >
                  <EuiLoadingSpinner aria-label={i18n.LOADING_CHAT} size="xl" />
                </div>
              }
            >
              <EmbeddableConversation
                agentId={agentBuilderDefaultAgentId}
                ariaLabelledBy={titleId}
                greetingMessage={i18n.GREETING}
                onClose={onClose}
                sessionTag="pnd"
              />
            </React.Suspense>
          </div>
        ) : null}
      </EuiAccordion>
    </EuiPanel>
  );
};
