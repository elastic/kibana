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
import { InfraPageTemplate } from './infra_page_template';

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
          PageTemplate: ({ children }: { children: React.ReactNode }) => (
            <div data-test-subj="observabilityPageTemplate">{children}</div>
          ),
        },
      },
      share: {
        url: {
          locators: {
            get: () => ({ getRedirectUrl: () => '/app/observabilityOnboarding' }),
          },
        },
      },
      docLinks: { links: { observability: { guide: 'https://docs.elastic.co' } } },
    },
  }),
}));

jest.mock('../../../hooks/use_fetcher', () => ({
  isPending: () => false,
  useFetcher: () => ({ data: undefined, status: 'success' }),
}));

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useLinkProps: () => ({ href: '/app/metrics/settings' }),
}));

const renderTemplate = (header?: React.ReactNode) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <InfraPageTemplate header={header} hasDataOverride={true}>
          <div data-test-subj="pageBody">body</div>
        </InfraPageTemplate>
      </EuiProvider>
    </I18nProvider>
  );

describe('InfraPageTemplate header', () => {
  beforeEach(() => {
    mockSourceState.source = {
      status: { remoteClustersExist: true },
      configuration: { metricAlias: 'metrics-*' },
    };
    mockSourceState.error = undefined;
    mockSourceState.isLoading = false;
  });

  it('keeps header and body when the source loads', () => {
    renderTemplate(<div data-test-subj="pageHeader">header</div>);

    expect(screen.getByTestId('pageHeader')).toBeInTheDocument();
    expect(screen.getByTestId('pageBody')).toBeInTheDocument();
  });

  it('keeps header on source-error and does not render page body', () => {
    mockSourceState.error = 'source failed';

    renderTemplate(<div data-test-subj="pageHeader">header</div>);

    expect(screen.getByTestId('pageHeader')).toBeInTheDocument();
    expect(screen.getByTestId('infraErrorPageTryAgainButton')).toBeInTheDocument();
    expect(screen.queryByTestId('pageBody')).not.toBeInTheDocument();
  });

  it('keeps header when remote clusters are missing and does not render page body', () => {
    mockSourceState.source = {
      status: { remoteClustersExist: false },
      configuration: { metricAlias: 'missing:metrics-*' },
    };

    renderTemplate(<div data-test-subj="pageHeader">header</div>);

    expect(screen.getByTestId('pageHeader')).toBeInTheDocument();
    expect(screen.getByTestId('infraHostsNoRemoteCluster')).toBeInTheDocument();
    expect(screen.queryByTestId('pageBody')).not.toBeInTheDocument();
  });
});
