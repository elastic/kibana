/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import React, { FC } from 'react';
import { EuiTitle, EuiFlexGroup, EuiFlexItem, EuiText, EuiPanel } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { Chat } from '../components/chat';
import { ConversationList } from '../components/conversation_list';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { useConversationList } from '../hooks/use_conversation_list';

const pageSectionContentClassName = css`
  width: 100%;
  display: flex;
  flex-grow: 1;
  padding-top: 0;
  padding-bottom: 0;
  height: 100%;
  max-block-size: calc(100vh - 96px);
`;

export const WorkchatChatPage: FC<{}> = () => {
  useBreadcrumb([{ text: 'Kibana' }, { text: 'WorkChat' }]);
  const { conversations } = useConversationList();

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="workchatPageChat"
      grow={false}
      panelled={false}
    >
      <KibanaPageTemplate.Sidebar>
        <ConversationList conversations={conversations} />
      </KibanaPageTemplate.Sidebar>

      <KibanaPageTemplate.Section paddingSize="none" grow contentProps={{ css: 'height: 100%' }}>
        <EuiFlexGroup
          className={pageSectionContentClassName}
          direction="column"
          gutterSize="none"
          justifyContent="center"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiPanel hasBorder={true} hasShadow={false}>
              <EuiFlexGroup>
                <EuiFlexItem grow>
                  <EuiTitle>
                    <h2>WorkChat</h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText>You know, for chat!</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>

          <Chat />
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
