/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiPageHeaderSection, EuiTitle } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { Chat } from '../components/chat';

export const WorkchatChatPage: FC<{}> = () => {
  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="workchatPageChat"
      grow={false}
      panelled={false}
    >
      <KibanaPageTemplate.Header paddingSize="m">
        <EuiPageHeaderSection>
          <EuiTitle>
            <h2>WorkChat</h2>
          </EuiTitle>
        </EuiPageHeaderSection>
        <EuiPageHeaderSection>Hello</EuiPageHeaderSection>
      </KibanaPageTemplate.Header>

      <KibanaPageTemplate.Section>
        <div>You know, for chat!</div>
        <Chat />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
