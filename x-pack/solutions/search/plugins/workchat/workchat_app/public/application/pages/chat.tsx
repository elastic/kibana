/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import React, { useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { EuiFlexGroup } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { ConversationEventChanges } from '../../../common/chat_events';
import { Chat } from '../components/chat';
import { ChatHeader } from '../components/chat_header';
import { ConversationList } from '../components/conversation_list';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { useConversationList } from '../hooks/use_conversation_list';
import { useKibana } from '../hooks/use_kibana';

const newConversationId = 'new';

const pageSectionContentClassName = css`
  width: 100%;
  display: flex;
  flex-grow: 1;
  padding-top: 0;
  padding-bottom: 0;
  height: 100%;
  max-block-size: calc(100vh - 96px);
`;

export const WorkchatChatPage: React.FC<{}> = () => {
  useBreadcrumb([{ text: 'Kibana' }, { text: 'WorkChat' }]);
  const {
    services: { application },
  } = useKibana();

  const { conversations, refresh: refreshConversations } = useConversationList();

  const { conversationId: conversationIdFromParams } = useParams<{
    conversationId: string | undefined;
  }>();

  const conversationId = useMemo(() => {
    return conversationIdFromParams === newConversationId ? undefined : conversationIdFromParams;
  }, [conversationIdFromParams]);

  const onConversationUpdate = useCallback(
    (changes: ConversationEventChanges) => {
      if (!conversationId) {
        application.navigateToApp('workchat', { path: `/chat/${changes.id}` });
      }
      refreshConversations();
    },
    [application, conversationId, refreshConversations]
  );

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="workchatPageChat"
      grow={false}
      panelled={false}
    >
      <KibanaPageTemplate.Sidebar paddingSize="none">
        <ConversationList
          conversations={conversations}
          activeConversationId={conversationId}
          onConversationSelect={(newConvId) => {
            application.navigateToApp('workchat', { path: `/chat/${newConvId}` });
          }}
          onNewConversationSelect={() => {
            application.navigateToApp('workchat', { path: `/chat/${newConversationId}` });
          }}
        />
      </KibanaPageTemplate.Sidebar>

      <KibanaPageTemplate.Section paddingSize="none" grow contentProps={{ css: 'height: 100%' }}>
        <EuiFlexGroup
          className={pageSectionContentClassName}
          direction="column"
          gutterSize="none"
          justifyContent="center"
          responsive={false}
        >
          <ChatHeader />
          <Chat conversationId={conversationId} onConversationUpdate={onConversationUpdate} />
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
