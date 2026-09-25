/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { TimeRange } from '@kbn/es-query';
import { coreMock } from '@kbn/core/public/mocks';
import { ServicesContent } from './services';
import {
  useKibanaContextForPlugin,
  useKibanaEnvironmentContext,
} from '../../../../hooks/use_kibana';
import { useRequestObservable } from '../../hooks/use_request_observable';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';
import { useMetadataStateContext } from '../../hooks/use_metadata_state';

const mockUseFetcher = jest.fn();

jest.mock('../../../../hooks/use_kibana');
jest.mock('../../hooks/use_request_observable');
jest.mock('../../hooks/use_tab_switcher');
jest.mock('../../hooks/use_metadata_state');
jest.mock('../../../../hooks/use_time_range', () => ({
  useTimeRange: ({ rangeFrom, rangeTo }: { rangeFrom: string; rangeTo: string }) => ({
    from: rangeFrom,
    to: rangeTo,
  }),
}));
jest.mock('../../../../hooks/use_fetcher', () => ({
  isPending: (status: string) =>
    status === 'loading' || status === 'not_initiated' || status === 'pending',
  useFetcher: (...args: unknown[]) => mockUseFetcher(...args),
}));
jest.mock('@kbn/observability-shared-plugin/public', () => ({
  useLinkProps: () => ({ href: '/app/apm' }),
}));

const useKibanaMock = useKibanaContextForPlugin as jest.MockedFunction<
  typeof useKibanaContextForPlugin
>;
const useKibanaEnvironmentContextMock = useKibanaEnvironmentContext as jest.MockedFunction<
  typeof useKibanaEnvironmentContext
>;
const useRequestObservableMock = useRequestObservable as jest.MockedFunction<
  typeof useRequestObservable
>;
const useTabSwitcherContextMock = useTabSwitcherContext as jest.MockedFunction<
  typeof useTabSwitcherContext
>;
const useMetadataStateContextMock = useMetadataStateContext as jest.MockedFunction<
  typeof useMetadataStateContext
>;

const SHOW_ALL_TEST_SUBJ = 'infraAssetDetailsViewAPMShowAllServicesButton';
const SERVICES_CONTAINER_TEST_SUBJ = 'infraAssetDetailsServicesContainer';

const dateRange: TimeRange = {
  from: '2023-03-28T18:20:00.000Z',
  to: '2023-03-28T18:21:00.000Z',
};

const mockFetcher = ({
  services,
  status = 'success',
  error,
}: {
  services?: Array<{ serviceName: string; agentName: string | null }>;
  status?: string;
  error?: Error;
}) => {
  mockUseFetcher.mockReturnValue({ data: services ? { services } : undefined, status, error });
};

const mockMetadata = (hasSystemIntegration = true, loading = false) => {
  useMetadataStateContextMock.mockReturnValue({
    metadata: { id: 'host-1', name: 'host-1', features: [], hasSystemIntegration },
    loading,
    error: null,
    refresh: jest.fn(),
  } as unknown as ReturnType<typeof useMetadataStateContext>);
};

const renderServices = () =>
  render(
    <I18nProvider>
      <ServicesContent hostName="host-1" dateRange={dateRange} />
    </I18nProvider>
  );

describe('ServicesContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useKibanaMock.mockReturnValue({
      services: coreMock.createStart(),
    } as unknown as ReturnType<typeof useKibanaContextForPlugin>);
    useKibanaEnvironmentContextMock.mockReturnValue({
      isServerlessEnv: false,
    } as unknown as ReturnType<typeof useKibanaEnvironmentContext>);
    useRequestObservableMock.mockReturnValue({ request$: undefined } as unknown as ReturnType<
      typeof useRequestObservable
    >);
    useTabSwitcherContextMock.mockReturnValue({
      isActiveTab: () => true,
    } as unknown as ReturnType<typeof useTabSwitcherContext>);
    mockMetadata();
    mockFetcher({ services: [] });
  });

  it('renders the Show all action', () => {
    renderServices();

    expect(screen.getByTestId(SHOW_ALL_TEST_SUBJ)).toBeVisible();
  });

  it('renders a link for each service running on the host', () => {
    mockFetcher({
      services: [
        { serviceName: 'checkout', agentName: 'nodejs' },
        { serviceName: 'payments', agentName: null },
      ],
    });
    renderServices();

    const container = screen.getByTestId(SERVICES_CONTAINER_TEST_SUBJ);
    expect(within(container).getAllByTestId('serviceLink')).toHaveLength(2);
    expect(within(container).getByTestId('serviceNameText-checkout')).toBeInTheDocument();
    expect(within(container).getByTestId('serviceNameText-payments')).toBeInTheDocument();
  });

  it('renders a loading spinner while the services request is pending', () => {
    mockFetcher({ status: 'loading' });
    renderServices();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId(SERVICES_CONTAINER_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('renders a loading spinner while the metadata is still loading', () => {
    mockMetadata(true, true);
    renderServices();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders an error callout when the services request fails', () => {
    mockFetcher({ status: 'failure', error: new Error('boom') });
    renderServices();

    expect(screen.getByText('An error occurred while fetching services.')).toBeInTheDocument();
    expect(screen.queryByTestId(SERVICES_CONTAINER_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('points at the APM tutorial when the host has the system integration but no services', () => {
    renderServices();

    expect(screen.getByTestId('assetDetailsTooltipAPMTutorialLink')).toBeInTheDocument();
    expect(screen.getByTestId('assetDetailsAPMTroubleshootingLink')).toBeInTheDocument();
  });

  it('only links to troubleshooting when the host has no system integration', () => {
    mockMetadata(false);
    renderServices();

    expect(screen.getByText('No services found on this host.')).toBeInTheDocument();
    expect(screen.queryByTestId('assetDetailsTooltipAPMTutorialLink')).not.toBeInTheDocument();
    expect(screen.getByTestId('assetDetailsAPMHostTroubleshootingLink')).toBeInTheDocument();
  });
});
