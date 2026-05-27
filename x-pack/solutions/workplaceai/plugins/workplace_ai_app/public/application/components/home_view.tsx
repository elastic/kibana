/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { UseEuiTheme } from '@elastic/eui';
import { WorkplaceAIHomeHeader } from './workplace_ai_home_header';
import { ExploreAgentPrompt } from './explore_agent_prompt';
import { ExploreWorkplaceAI } from './explore_workplace_ai';
import { SnapshotsSection } from './snapshots_section';
import { WorkplaceAIHomeFooter } from './workplace_ai_home_footer';
import { EarsConnectionsSection } from './ears_connections_section';
import { useWorkplaceAIConfig } from '../hooks/use_kibana';

const sectionGapStyles = ({ euiTheme }: UseEuiTheme) => ({
  height: euiTheme.size.xxxxl,
});

export const WorkplaceAIHomeView: React.FC<{}> = () => {
  const config = useWorkplaceAIConfig();
  const isEarsUiEnabled = config.ears?.ui_enabled;

  return (
    <KibanaPageTemplate data-test-subj="workplaceAIHomePage">
      <KibanaPageTemplate.Section restrictWidth={true} paddingSize="l">
        <WorkplaceAIHomeHeader />

        <ExploreAgentPrompt />

        <div css={sectionGapStyles} />

        <ExploreWorkplaceAI />

        {isEarsUiEnabled && (
          <>
            <div css={sectionGapStyles} />
            <EarsConnectionsSection />
          </>
        )}

        <div css={sectionGapStyles} />

        <SnapshotsSection />

        <div css={sectionGapStyles} />

        <WorkplaceAIHomeFooter />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
