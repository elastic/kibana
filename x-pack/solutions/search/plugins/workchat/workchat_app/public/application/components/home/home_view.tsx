/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiButton, EuiSpacer } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useNavigation } from '../../hooks/use_navigation';
import { HomeAgentTable } from './home_agent_table';

export const WorkChatHomeView: React.FC<{}> = () => {
  const { navigateToWorkchatUrl } = useNavigation();
  return (
    <KibanaPageTemplate panelled>
      <KibanaPageTemplate.Header pageTitle="WorkChat" />

      <KibanaPageTemplate.Section>
        <EuiTitle size="s">
          <h4>Your agents</h4>
        </EuiTitle>
        <EuiSpacer />
        <HomeAgentTable />
        <EuiSpacer />
        <EuiButton
          onClick={() => {
            navigateToWorkchatUrl('/agents');
          }}
        >
          Go to agent management
        </EuiButton>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
