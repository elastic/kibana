/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { useKibana } from '../hooks/use_kibana';
import { GETTING_STARTED_SESSIONSTORAGE_KEY } from '@kbn/search-shared-ui';
import { useUsageTracker } from '../contexts/usage_tracker_context';
import { AnalyticsEvents } from '../../common';
import { SearchGettingStartedPageTemplate } from '../layout/page_template';
import { ConsoleTutorialsGroup } from './tutorials/console_tutorials_group';
import { AgentInstallSection } from './agent_install/agent_install';
import { SearchGettingStartedHeader } from './header';

export const SearchGettingStartedPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { application },
  } = useKibana();
  const usageTracker = useUsageTracker();
  useEffect(() => {
    usageTracker.load(AnalyticsEvents.gettingStartedLoaded);
    sessionStorage.setItem(GETTING_STARTED_SESSIONSTORAGE_KEY, 'true');
  }, [usageTracker]);

  return (
    <SearchGettingStartedPageTemplate>
      <EuiPageTemplate.Section data-test-subj="gettingStartedHeader" paddingSize="xl" grow={false}
      >
        <EuiSpacer size="xl" />
        <SearchGettingStartedHeader />
        <EuiSpacer size="xl" />
        <EuiPanel color="subdued" paddingSize="none">
          <AgentInstallSection />
          <EuiPanel
            color="transparent"
            paddingSize="none"
            css={{
              paddingInline: euiTheme.size.l,
              paddingBlock: euiTheme.size.m,
            }}
          >
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued"><p>Start with some sample data:</p></EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="upload" color="text" size="s" onClick={() => {
                  application.navigateToApp('home', { path: '#/tutorial_directory/fileDataViz' });
                }}>Upload files</EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="package" color="text" size="s" onClick={() => {
                  application.navigateToApp('home', { path: '#/tutorial_directory/sampleData' });
                }}>View sample data</EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>

          </EuiPanel>
        </EuiPanel>
      </EuiPageTemplate.Section>

      <EuiPageTemplate.Section data-test-subj="gettingStartedConsoleTutorials" paddingSize="xl">
        <ConsoleTutorialsGroup />
      </EuiPageTemplate.Section>
      <EuiSpacer size="xl" />
    </SearchGettingStartedPageTemplate>
  );
};
