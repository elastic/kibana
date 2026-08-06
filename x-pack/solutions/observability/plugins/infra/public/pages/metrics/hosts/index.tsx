/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiPageHeaderProps } from '@elastic/eui';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { css } from '@emotion/react';
import { OnboardingFlow } from '../../../components/shared/templates/no_data_config';
import { InfraPageTemplate } from '../../../components/shared/templates/infra_page_template';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { hostsTitle } from '../../../translations';
import { fullHeightContentStyles } from '../../../page_template.styles';
import { HostsContainer } from './components/hosts_container';
import { UnifiedSearchProvider } from './hooks/use_unified_search';
import { HostsTimeRangeMetadataProvider } from './hooks/use_hosts_metadata_provider';
import { SearchBar } from './components/search_bar/search_bar';

export const HostsPage = () => {
  useTrackPageview({ app: 'infra_metrics', path: 'hosts' });
  useTrackPageview({ app: 'infra_metrics', path: 'hosts', delay: 15000 });

  useMetricsBreadcrumbs([
    {
      text: hostsTitle,
    },
  ]);

  return (
    <div className={APP_WRAPPER_CLASS}>
      <UnifiedSearchProvider>
        <HostsTimeRangeMetadataProvider>
          <InfraPageTemplate
            dataSourceAvailability="host"
            onboardingFlow={OnboardingFlow.Hosts}
            pageHeader={{
              alignItems: 'center',
              color: 'subdued' as unknown as EuiPageHeaderProps['color'],
              rightSideItems: [],
              pageTitle: (
                <div
                  css={css`
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                  `}
                >
                  <h1>{hostsTitle}</h1>
                </div>
              ),
              children: <SearchBar />,
            }}
            pageSectionProps={{
              contentProps: {
                css: fullHeightContentStyles,
              },
            }}
          >
            <HostsContainer />
          </InfraPageTemplate>
        </HostsTimeRangeMetadataProvider>
      </UnifiedSearchProvider>
    </div>
  );
};
