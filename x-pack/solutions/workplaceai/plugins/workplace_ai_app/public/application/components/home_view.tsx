/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiSpacer } from '@elastic/eui';
import { WorkplaceAIHomeHeader } from './workplace_ai_home_header';
import { ExploreAgentPrompt } from './explore_agent_prompt';
import { ExploreWorkplaceAI } from './explore_workplace_ai';
import { SnapshotsSection } from './snapshots_section';
import { WorkplaceAIHomeFooter } from './workplace_ai_home_footer';

export const WorkplaceAIHomeView: React.FC<{}> = () => {
  return (
    <KibanaPageTemplate data-test-subj="workplaceAIHomePage">
      <KibanaPageTemplate.Section restrictWidth={true} paddingSize="l">
        <WorkplaceAIHomeHeader />

        <ExploreAgentPrompt />

        <EuiSpacer size="xxl" />

        <ExploreWorkplaceAI />

        <EuiSpacer size="xxl" />

        <SnapshotsSection />

        <EuiSpacer size="xxl" />

        <WorkplaceAIHomeFooter />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
