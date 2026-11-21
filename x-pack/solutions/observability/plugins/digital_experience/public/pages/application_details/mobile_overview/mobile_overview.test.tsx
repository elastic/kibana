/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { MobileKpisResponse } from '../../../../common/types/mobile';
import { SingleSelectFilter } from '../../../components/single_select_filter';
import { useApiClient } from '../../../hooks/use_api_client';
import { useDigitalExperienceParams } from '../../../hooks/use_digital_experience_params';
import { useDiscoverHref } from '../../../hooks/use_discover_href';
import { useEnvironment } from '../../../hooks/use_environment';
import { useFormatters } from '../../../hooks/use_formatters';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useUpdateUrlQuery } from '../../../hooks/use_update_url_query';
import { MobileOverview } from './mobile_overview';

jest.mock('../../../hooks/use_api_client');
jest.mock('../../../hooks/use_digital_experience_params');
jest.mock('../../../hooks/use_discover_href');
jest.mock('../../../hooks/use_environment');
jest.mock('../../../hooks/use_formatters');
jest.mock('../../../hooks/use_time_range');
jest.mock('../../../hooks/use_update_url_query');
jest.mock('../../../components/time_range_picker', () => ({ TimeRangePicker: () => null }));
jest.mock('../../../components/environment_filter', () => ({ EnvironmentFilter: () => null }));
jest.mock('../../../components/single_select_filter', () => ({
  SingleSelectFilter: jest.fn(() => null),
}));

const NO_VALUE = { value: null, previous: null, delta: null };

const KPIS: MobileKpisResponse = {
  hasData: true,
  isPartial: false,
  sessions: { value: 12, previous: 10, delta: 2 },
  users: { value: 4, previous: 4, delta: 0 },
  crashFreeSessions: NO_VALUE,
  errorRate: { value: 0.5, previous: 0.25, delta: 0.25 },
  releases: ['2.0.0', '1.9.0'],
  osNames: ['iOS', 'iPadOS', 'Android'],
  platforms: ['android', 'ios'],
  environments: ['production'],
  esql: 'FROM traces-*.otel-*,logs-*.otel-*',
};

const fetch = jest.fn();
const updateUrlQuery = jest.fn();

const mockParams = (query: { release?: string; osName?: string } = {}) =>
  jest.mocked(useDigitalExperienceParams).mockReturnValue({
    path: { serviceName: 'shop-mobile' },
    query: { source: 'otel', applicationType: 'mobile', ...query },
  } as unknown as ReturnType<typeof useDigitalExperienceParams>);

const filterProps = (testSubj: string) =>
  jest
    .mocked(SingleSelectFilter)
    .mock.calls.map(([props]) => props)
    .filter((props) => props['data-test-subj'] === testSubj)
    .pop();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>
    <EuiProvider>{children}</EuiProvider>
  </I18nProvider>
);

const renderPage = () => render(<MobileOverview serviceName="shop-mobile" />, { wrapper: Wrapper });

beforeEach(() => {
  jest.clearAllMocks();
  fetch.mockResolvedValue(KPIS);
  jest
    .mocked(useApiClient)
    .mockReturnValue({ fetch } as unknown as ReturnType<typeof useApiClient>);
  jest.mocked(useTimeRange).mockReturnValue({
    timeRange: { rangeFrom: '2021-01-18T12:00:00.000Z', rangeTo: '2021-01-18T13:00:00.000Z' },
    isTimeRangeInUrl: true,
    setTimeRange: jest.fn(),
  });
  jest
    .mocked(useEnvironment)
    .mockReturnValue({ environment: undefined, setEnvironment: jest.fn() });
  jest.mocked(useFormatters).mockReturnValue({
    formatNumber: String,
    formatPercent: (share) => `${Math.round(share * 100)}%`,
    formatDate: String,
    timeZone: 'UTC',
  });
  jest.mocked(useDiscoverHref).mockReturnValue('/app/discover');
  jest.mocked(useUpdateUrlQuery).mockReturnValue(updateUrlQuery);
  mockParams();
});

describe('MobileOverview', () => {
  it('shows the KPI row and every section', async () => {
    renderPage();

    expect(await screen.findByTestId('digitalExperienceMobileKpiSessionsValue')).toHaveTextContent(
      '12'
    );
    expect(screen.getByTestId('digitalExperienceMobileKpiCrashFreeValue')).toHaveTextContent(
      'Not enough data'
    );
    expect(screen.getByTestId('digitalExperienceMobileKpiErrorRateValue')).toHaveTextContent('0.5');
    [
      'healthSummary',
      'releaseHealth',
      'stability',
      'usersAndEngagement',
      'performance',
      'views',
    ].forEach((section) =>
      expect(
        screen.getByTestId(`digitalExperienceMobileSection-${section}Empty`)
      ).toHaveTextContent('Coming soon')
    );
  });

  it('links the KPI row to Discover once, and shows the crash-free change in percentage points', async () => {
    fetch.mockResolvedValue({
      ...KPIS,
      crashFreeSessions: { value: 0.99, previous: 0.98, delta: 0.01 },
    });
    renderPage();

    expect(await screen.findByTestId('digitalExperienceMobileKpisDiscover')).toHaveAttribute(
      'href',
      '/app/discover'
    );
    expect(screen.getByTestId('digitalExperienceMobileKpiCrashFreeChange')).toHaveTextContent(
      '+1 pp'
    );
    expect(useDiscoverHref).toHaveBeenLastCalledWith(KPIS.esql, {
      from: '2021-01-18T12:00:00.000Z',
      to: '2021-01-18T13:00:00.000Z',
    });
  });

  it('hides the Discover link while the KPIs of new filters load', async () => {
    const { rerender } = renderPage();
    await screen.findByTestId('digitalExperienceMobileKpisDiscover');

    fetch.mockReturnValue(new Promise(() => {}));
    mockParams({ osName: 'iPadOS' });
    rerender(<MobileOverview serviceName="shop-mobile" />);

    await waitFor(() =>
      expect(screen.queryByTestId('digitalExperienceMobileKpisDiscover')).toBeNull()
    );
  });

  it("warns that the values may be missing data when the user can't read every index", async () => {
    fetch.mockResolvedValue({ ...KPIS, isPartial: true });
    renderPage();

    expect(
      await screen.findByTestId('digitalExperienceMobileKpisPartialAccess')
    ).toBeInTheDocument();
  });

  it('asks to check the access, not to instrument the app, when nothing readable matched', async () => {
    fetch.mockResolvedValue({ ...KPIS, hasData: false, isPartial: true });
    renderPage();

    expect(await screen.findByTestId('digitalExperienceMobileUnreadableData')).toHaveTextContent(
      'No mobile data for this application in the indices you can read'
    );
    expect(screen.queryByTestId('digitalExperienceMobileEmpty')).toBeNull();
    expect(screen.queryByTestId('digitalExperienceMobileAndroidDocsLink')).toBeNull();
    expect(screen.queryByTestId('digitalExperienceMobileKpisPartialAccess')).toBeNull();
    expect(screen.getByTestId('digitalExperienceMobileUnreadableData')).not.toHaveTextContent(
      'Nothing matched the filters'
    );
  });

  it('names both the filters and the access when nothing readable matched the filters', async () => {
    mockParams({ release: '9.9.9' });
    fetch.mockResolvedValue({ ...KPIS, hasData: false, isPartial: true });
    renderPage();

    expect(await screen.findByTestId('digitalExperienceMobileUnreadableData')).toHaveTextContent(
      'Nothing matched the filters in the indices you can read. Change the filters'
    );
  });

  it('shows no access warning when the user reads every index', async () => {
    renderPage();
    await screen.findByTestId('digitalExperienceMobileKpisDiscover');

    expect(screen.queryByTestId('digitalExperienceMobileKpisPartialAccess')).toBeNull();
  });

  it('queries the KPIs with the OS and release from the URL', async () => {
    mockParams({ osName: 'iPadOS', release: '2.0.0' });
    renderPage();

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        'GET /internal/digital_experience/mobile_applications/{serviceName}/kpis',
        expect.objectContaining({
          params: {
            path: { serviceName: 'shop-mobile' },
            query: expect.objectContaining({ osName: 'iPadOS', release: '2.0.0' }),
          },
        })
      )
    );
  });

  it('keeps a selected release that the response does not list in the options', async () => {
    mockParams({ release: '0.9.0' });
    renderPage();
    await screen.findByTestId('digitalExperienceMobileKpis');

    const props = filterProps('digitalExperienceMobileReleaseFilter');
    expect(props?.options.map(({ value }) => value)).toEqual(['', '0.9.0', '2.0.0', '1.9.0']);
    expect(props?.selected).toBe('0.9.0');
  });

  it('puts the selected release in the URL, and removes it for all releases', async () => {
    renderPage();
    await screen.findByTestId('digitalExperienceMobileKpis');

    const props = filterProps('digitalExperienceMobileReleaseFilter');
    props?.onChange('2.0.0');
    props?.onChange('');

    expect(updateUrlQuery).toHaveBeenNthCalledWith(1, { release: '2.0.0' });
    expect(updateUrlQuery).toHaveBeenNthCalledWith(2, { release: undefined });
  });

  it('keeps a release named all selectable, apart from all releases', async () => {
    mockParams({ release: 'all' });
    renderPage();
    await screen.findByTestId('digitalExperienceMobileKpis');

    const props = filterProps('digitalExperienceMobileReleaseFilter');
    expect(props?.selected).toBe('all');
    props?.onChange('all');
    expect(updateUrlQuery).toHaveBeenCalledWith({ release: 'all' });
  });

  it('lists the OS names of the response, and keeps one in the URL', async () => {
    mockParams({ osName: 'iPadOS' });
    renderPage();
    await screen.findByTestId('digitalExperienceMobileKpis');

    const props = filterProps('digitalExperienceMobileOsFilter');
    expect(props?.options.map(({ value }) => value)).toEqual(['', 'iOS', 'iPadOS', 'Android']);
    expect(props?.selected).toBe('iPadOS');
    props?.onChange('');
    expect(updateUrlQuery).toHaveBeenCalledWith({ osName: undefined });
  });

  it('shows a badge per platform of the application', async () => {
    renderPage();
    await screen.findByTestId('digitalExperienceMobileKpis');

    expect(
      screen
        .getAllByTestId('digitalExperiencePlatformBadge')
        .map((badge) => badge.getAttribute('data-platform'))
    ).toEqual(['android', 'ios']);
  });

  it('shows the previous period on every KPI with Compare on', async () => {
    renderPage();
    await screen.findByTestId('digitalExperienceMobileKpis');
    expect(screen.queryByTestId('digitalExperienceMobileKpiSessionsPrevious')).toBeNull();

    fireEvent.click(screen.getByTestId('digitalExperienceMobileCompareToggle'));

    expect(screen.getByTestId('digitalExperienceMobileKpiSessionsPrevious')).toHaveTextContent(
      'Previous period: 10'
    );
    expect(screen.getByTestId('digitalExperienceMobileKpiUsersPrevious')).toBeInTheDocument();
  });

  it('shows the error with a retry, not endless loading, when the KPIs fail', async () => {
    fetch.mockRejectedValueOnce(new Error('Internal Server Error')).mockResolvedValue(KPIS);
    renderPage();

    expect(await screen.findByTestId('digitalExperienceMobileKpisError')).toHaveTextContent(
      'Internal Server Error'
    );
    expect(screen.queryByTestId('digitalExperienceMobileKpis')).toBeNull();

    fireEvent.click(screen.getByTestId('digitalExperienceMobileKpisRetry'));

    expect(await screen.findByTestId('digitalExperienceMobileKpis')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceMobileKpisError')).toBeNull();
  });

  it('links to the EDOT Android and iOS docs without mobile data', async () => {
    fetch.mockResolvedValue({ ...KPIS, hasData: false });
    renderPage();

    expect(await screen.findByTestId('digitalExperienceMobileEmpty')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceMobileAndroidDocsLink')).toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceMobileIosDocsLink')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceMobileKpis')).toBeNull();
    expect(screen.queryByTestId('digitalExperienceMobileUnreadableData')).toBeNull();
  });
});
