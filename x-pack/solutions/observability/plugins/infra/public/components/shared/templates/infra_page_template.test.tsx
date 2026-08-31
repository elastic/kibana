/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';
import { InfraPageTemplate } from './infra_page_template';
import { OnboardingFlow } from './no_data_config';

const HOSTS_ONBOARDING_HREF = '/app/observabilityOnboarding?category=host';
const PAGE_TEST_SUBJ = 'hostsViewPage';

type MockFetchStatus = 'loading' | 'success' | 'failure' | 'not_initiated' | 'pending';

const mockFetcherState: { hasData: boolean; status: MockFetchStatus } = {
  hasData: true,
  status: 'success',
};

const mockGetRedirectUrl = jest.fn().mockReturnValue(HOSTS_ONBOARDING_HREF);

let mockLastPageTemplateProps: {
  'data-test-subj'?: string;
  noDataConfig?: NoDataConfig;
} = {};

jest.mock('../../../containers/metrics_source', () => ({
  useSourceContext: () => ({
    source: {
      status: { remoteClustersExist: true },
      configuration: { metricAlias: 'metrics-*' },
    },
    error: undefined,
    isLoading: false,
    loadSource: jest.fn(),
  }),
  useMetricsDataViewContext: () => ({ error: undefined, refetch: jest.fn() }),
}));

jest.mock('../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: {
      observabilityAIAssistant: undefined,
      observabilityShared: {
        navigation: {
          PageTemplate: (props: {
            'data-test-subj'?: string;
            noDataConfig?: NoDataConfig;
            children?: React.ReactNode;
          }) => {
            mockLastPageTemplateProps = {
              'data-test-subj': props['data-test-subj'],
              noDataConfig: props.noDataConfig,
            };
            return <div data-test-subj={props['data-test-subj']}>{props.children}</div>;
          },
        },
      },
      share: {
        url: {
          locators: {
            get: () => ({ getRedirectUrl: mockGetRedirectUrl }),
          },
        },
      },
      docLinks: { links: { observability: { guide: 'https://docs.example' } } },
    },
  }),
}));

jest.mock('../../../hooks/use_fetcher', () => ({
  isPending: (status: string) =>
    status === 'loading' || status === 'not_initiated' || status === 'pending',
  useFetcher: () => ({
    data: { hasData: mockFetcherState.hasData },
    status: mockFetcherState.status,
  }),
}));

const renderTemplate = () =>
  render(
    <I18nProvider>
      <InfraPageTemplate
        data-test-subj={PAGE_TEST_SUBJ}
        dataSourceAvailability="host"
        onboardingFlow={OnboardingFlow.Hosts}
      >
        <div data-test-subj="hostsPageBody">body</div>
      </InfraPageTemplate>
    </I18nProvider>
  );

describe('InfraPageTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRedirectUrl.mockReturnValue(HOSTS_ONBOARDING_HREF);
    mockFetcherState.hasData = true;
    mockFetcherState.status = 'success';
    mockLastPageTemplateProps = {};
  });

  it('keeps the original test subject and omits no-data config when there is data', () => {
    renderTemplate();

    expect(mockLastPageTemplateProps['data-test-subj']).toBe(PAGE_TEST_SUBJ);
    expect(mockLastPageTemplateProps.noDataConfig).toBeUndefined();
  });

  it('renders the hosts onboarding card when there is no data', () => {
    mockFetcherState.hasData = false;

    renderTemplate();

    expect(mockGetRedirectUrl).toHaveBeenCalledWith({ category: OnboardingFlow.Hosts });
    expect(mockLastPageTemplateProps['data-test-subj']).toBe('noDataPage');
    expect(mockLastPageTemplateProps.noDataConfig).toEqual({
      action: {
        beats: expect.objectContaining({
          href: HOSTS_ONBOARDING_HREF,
          buttonText: 'Add data',
          docsLink: 'https://docs.example',
        }),
      },
    });
  });

  it('does not show the onboarding card while has-data is loading', () => {
    mockFetcherState.hasData = false;
    mockFetcherState.status = 'loading';

    renderTemplate();

    expect(mockLastPageTemplateProps.noDataConfig).toBeUndefined();
  });
});
