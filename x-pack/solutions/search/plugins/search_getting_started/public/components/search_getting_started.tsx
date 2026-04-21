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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GETTING_STARTED_SESSIONSTORAGE_KEY } from '@kbn/search-shared-ui';

import { useKibana } from '../hooks/use_kibana';
import { useUsageTracker } from '../contexts/usage_tracker_context';
import { AnalyticsEvents } from '../../common';
import { SearchGettingStartedPageTemplate } from '../layout/page_template';
import { ConsoleTutorialsGroup } from './tutorials/console_tutorials_group';
import { AgentInstallSection } from './agent_install/agent_install';
import { SearchGettingStartedHeader } from './header';
import { SampleDataPanelStyle } from './styles';

export const SearchGettingStartedPage: React.FC = () => {
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
      <EuiPageTemplate.Section data-test-subj="gettingStartedHeader" paddingSize="xl" grow={false}>
        <EuiSpacer size="xl" />
        <SearchGettingStartedHeader />
        <EuiSpacer size="xl" />
        <EuiPanel color="subdued" paddingSize="none">
          <AgentInstallSection />
          <EuiPanel color="transparent" paddingSize="none" css={SampleDataPanelStyle}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  <p>
                    {i18n.translate(
                      'xpack.search.gettingStarted.searchGettingStartedPage.description',
                      { defaultMessage: 'Start with some sample data:' }
                    )}
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <span>
                    <EuiButtonEmpty
                      iconType="upload"
                      color="text"
                      size="s"
                      data-test-subj="uploadFilesButton"
                      onClick={() => {
                        application.navigateToApp('home', {
                          path: '#/tutorial_directory/fileDataViz',
                        });
                      }}
                    >
                      {i18n.translate(
                        'xpack.search.gettingStarted.searchGettingStartedPage.uploadFilesBtn',
                        { defaultMessage: 'Upload files' }
                      )}
                    </EuiButtonEmpty>
                  </span>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <span>
                    <EuiButtonEmpty
                      iconType="package"
                      color="text"
                      size="s"
                      data-test-subj="viewSampleDataButton"
                      onClick={() => {
                        application.navigateToApp('home', {
                          path: '#/tutorial_directory/sampleData',
                        });
                      }}
                    >
                      {i18n.translate(
                        'xpack.search.gettingStarted.searchGettingStartedPage.viewSampleDataButton',
                        { defaultMessage: 'View sample data' }
                      )}
                    </EuiButtonEmpty>
                  </span>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiPanel>
      </EuiPageTemplate.Section>
      <EuiSpacer />
      <EuiPageTemplate.Section data-test-subj="gettingStartedConsoleTutorials" paddingSize="xl">
        <ConsoleTutorialsGroup />
      </EuiPageTemplate.Section>
      <EuiSpacer size="xl" />
    </SearchGettingStartedPageTemplate>
  );
};
