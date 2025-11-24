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
import { ExploreDefaultAgent } from './explore_default_agent';
import { ExploreWorkplaceAI } from './explore_workplace_ai';
import { SnapshotsSection } from './snapshots_section';
import { WorkplaceAIHomeFooter } from './workplace_ai_home_footer';

export const WorkplaceAIHomeView: React.FC<{}> = () => {
  return (
    <KibanaPageTemplate data-test-subj="workplaceAIHomePage">
      <KibanaPageTemplate.Section restrictWidth={true} paddingSize="l">
        <WorkplaceAIHomeHeader />

        <ExploreDefaultAgent />

        <EuiSpacer size="xl" />

        <ExploreWorkplaceAI />

        <EuiSpacer size="xl" />

        <SnapshotsSection />

        <EuiSpacer size="xl" />

        <WorkplaceAIHomeFooter />

        <EuiSpacer size="xl" />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
