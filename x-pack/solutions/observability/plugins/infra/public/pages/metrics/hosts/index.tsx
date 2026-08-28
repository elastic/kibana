/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPageSection, useEuiTheme } from '@elastic/eui';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { AppHeader } from '@kbn/app-header';
import { css } from '@emotion/react';
import { InfraPageTemplate } from '../../../components/shared/templates/infra_page_template';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { hostsTitle } from '../../../translations';
import { HostsContainer } from './components/hosts_container';
import { HostsOnboardingPage } from './components/hosts_onboarding_page';
import { UnifiedSearchProvider } from './hooks/use_unified_search';
import { HostsTimeRangeMetadataProvider } from './hooks/use_hosts_metadata_provider';
import { useHostsHasData } from './hooks/use_hosts_has_data';
import { SearchBar } from './components/search_bar/search_bar';
import { useMetricsAppHeaderMenu } from '../header/use_metrics_app_header_menu';

export const HostsPage = (): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  useTrackPageview({ app: 'infra_metrics', path: 'hosts' });
  useTrackPageview({ app: 'infra_metrics', path: 'hosts', delay: 15000 });

  useMetricsBreadcrumbs(
    [
      {
        text: hostsTitle,
      },
    ],
    { parent: 'app' }
  );

  const { menu, flyouts } = useMetricsAppHeaderMenu();
  const { hasData, loading } = useHostsHasData();
  const showOnboarding = !loading && !hasData;

  // Template noDataConfig ignores children; Hosts renders onboarding as body instead.
  return (
    <div className={APP_WRAPPER_CLASS}>
      <InfraPageTemplate
        hasDataOverride={!showOnboarding}
        header={
          <>
            <AppHeader title={hostsTitle} menu={menu} spacing="standard" />
            {flyouts}
          </>
        }
        pageSectionProps={{
          paddingSize: 'none',
          contentProps: {
            css: css`
              display: flex;
              flex-direction: column;
              flex: 1 1 auto;
              min-height: 0;
              height: 100%;
              width: 100%;
              padding-bottom: 0;
            `,
          },
        }}
      >
        {showOnboarding ? (
          <HostsOnboardingPage />
        ) : (
          <UnifiedSearchProvider>
            <HostsTimeRangeMetadataProvider>
              <EuiPageSection
                paddingSize="m"
                grow
                restrictWidth={false}
                contentProps={{
                  css: css`
                    display: flex;
                    flex-direction: column;
                    flex: 1 1 auto;
                    min-height: 0;
                    height: 100%;
                    width: 100%;
                    padding-top: ${euiTheme.size.base};
                    padding-bottom: 0;
                  `,
                }}
              >
                <EuiFlexGroup
                  direction="column"
                  gutterSize="m"
                  css={css`
                    flex: 1;
                    min-height: 0;
                  `}
                >
                  <EuiFlexItem grow={false}>
                    <SearchBar />
                  </EuiFlexItem>
                  <EuiFlexItem
                    css={css`
                      min-height: 0;
                      overflow-y: auto;
                    `}
                  >
                    <HostsContainer />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPageSection>
            </HostsTimeRangeMetadataProvider>
          </UnifiedSearchProvider>
        )}
      </InfraPageTemplate>
    </div>
  );
};
