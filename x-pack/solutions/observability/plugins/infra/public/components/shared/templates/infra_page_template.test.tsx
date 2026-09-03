/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
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

const mockSourceState: {
  source:
    | {
        status: { remoteClustersExist: boolean };
        configuration: { metricAlias: string };
      }
    | undefined;
  error: string | undefined;
  isLoading: boolean;
  loadSource: () => void;
} = {
  source: {
    status: { remoteClustersExist: true },
    configuration: { metricAlias: 'metrics-*' },
  },
  error: undefined,
  isLoading: false,
  loadSource: jest.fn(),
};

const mockGetRedirectUrl = jest.fn().mockReturnValue(HOSTS_ONBOARDING_HREF);

let mockLastPageTemplateProps: {
  'data-test-subj'?: string;
  noDataConfig?: NoDataConfig;
} = {};

jest.mock('../../../containers/metrics_source', () => ({
  useSourceContext: () => mockSourceState,
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

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useLinkProps: () => ({ href: '/app/metrics/settings' }),
}));

const resetSharedMocks = () => {
  jest.clearAllMocks();
  mockGetRedirectUrl.mockReturnValue(HOSTS_ONBOARDING_HREF);
  mockFetcherState.hasData = true;
  mockFetcherState.status = 'success';
  mockLastPageTemplateProps = {};
  mockSourceState.source = {
    status: { remoteClustersExist: true },
    configuration: { metricAlias: 'metrics-*' },
  };
  mockSourceState.error = undefined;
  mockSourceState.isLoading = false;
};

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

describe('InfraPageTemplate', () => {
  beforeEach(() => {
    resetSharedMocks();
  });

  const renderHostsTemplate = () =>
    renderWithProviders(
      <InfraPageTemplate
        data-test-subj={PAGE_TEST_SUBJ}
        dataSourceAvailability="host"
        onboardingFlow={OnboardingFlow.Hosts}
      >
        <div data-test-subj="hostsPageBody">body</div>
      </InfraPageTemplate>
    );

  it('keeps the original test subject and omits no-data config when there is data', () => {
    renderHostsTemplate();

    expect(mockLastPageTemplateProps['data-test-subj']).toBe(PAGE_TEST_SUBJ);
    expect(mockLastPageTemplateProps.noDataConfig).toBeUndefined();
  });

  it('renders the hosts onboarding card when there is no data', () => {
    mockFetcherState.hasData = false;

    renderHostsTemplate();

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

    renderHostsTemplate();

    expect(mockLastPageTemplateProps.noDataConfig).toBeUndefined();
  });
});

describe('InfraPageTemplate header', () => {
  beforeEach(() => {
    resetSharedMocks();
  });

  const renderHeaderTemplate = (header?: React.ReactNode) =>
    renderWithProviders(
      <InfraPageTemplate header={header} hasDataOverride={true}>
        <div data-test-subj="pageBody">body</div>
      </InfraPageTemplate>
    );

  it('keeps header and body when the source loads', () => {
    renderHeaderTemplate(<div data-test-subj="pageHeader">header</div>);

    expect(screen.getByTestId('pageHeader')).toBeInTheDocument();
    expect(screen.getByTestId('pageBody')).toBeInTheDocument();
  });

  it('keeps header on source-error and does not render page body', () => {
    mockSourceState.error = 'source failed';

    renderHeaderTemplate(<div data-test-subj="pageHeader">header</div>);

    expect(screen.getByTestId('pageHeader')).toBeInTheDocument();
    expect(screen.getByTestId('infraErrorPageTryAgainButton')).toBeInTheDocument();
    expect(screen.queryByTestId('pageBody')).not.toBeInTheDocument();
  });

  it('keeps header when remote clusters are missing and does not render page body', () => {
    mockSourceState.source = {
      status: { remoteClustersExist: false },
      configuration: { metricAlias: 'missing:metrics-*' },
    };

    renderHeaderTemplate(<div data-test-subj="pageHeader">header</div>);

    expect(screen.getByTestId('pageHeader')).toBeInTheDocument();
    expect(screen.getByTestId('infraHostsNoRemoteCluster')).toBeInTheDocument();
    expect(screen.queryByTestId('pageBody')).not.toBeInTheDocument();
  });
});
