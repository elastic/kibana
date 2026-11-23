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
import { EnvironmentFilter } from '../../../components/environment_filter';
import { SingleSelectFilter } from '../../../components/single_select_filter';
import { useApiClient } from '../../../hooks/use_api_client';
import { useDigitalExperienceParams } from '../../../hooks/use_digital_experience_params';
import { useEnvironment } from '../../../hooks/use_environment';
import { createFormatters, useFormatters } from '../../../hooks/use_formatters';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useUpdateUrlQuery } from '../../../hooks/use_update_url_query';
import { createUiSettingsMock } from '../../../test_utils/ui_settings_mock';
import { MobileOverview } from './mobile_overview';
import { useMobileKpis } from './use_mobile_kpis';

jest.mock('../../../hooks/use_api_client');
jest.mock('../../../hooks/use_digital_experience_params');
jest.mock('../../../hooks/use_environment');
jest.mock('../../../hooks/use_formatters', () => ({
  ...jest.requireActual('../../../hooks/use_formatters'),
  useFormatters: jest.fn(),
}));
jest.mock('../../../hooks/use_time_range');
jest.mock('../../../hooks/use_update_url_query');
jest.mock('../../../components/time_range_picker', () => ({ TimeRangePicker: () => null }));
jest.mock('../../../components/environment_filter', () => ({
  EnvironmentFilter: jest.fn(() => null),
}));
jest.mock('../../../components/single_select_filter', () => ({
  SingleSelectFilter: jest.fn(() => null),
}));

const KPIS: MobileKpisResponse = {
  hasData: true,
  isPartial: false,
  sessions: { value: 12, previous: 10, delta: 2 },
  users: { value: 4, previous: 4, delta: 0 },
  errorRate: { value: 0.5, previous: 0.25, delta: 0.25 },
  releases: [
    { key: '2.0.0', count: 8 },
    { key: '1.9.0', count: 4 },
  ],
  osNames: [
    { key: 'iOS', count: 6 },
    { key: 'iPadOS', count: 2 },
    { key: 'Android', count: 4 },
  ],
  platforms: ['android', 'ios'],
  environments: ['production'],
};

const fetch = jest.fn();
const updateUrlQuery = jest.fn();

const mockParams = (query: { release?: string; osName?: string; compare?: 'true' } = {}) =>
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

// The page fetches the KPIs and hands them to the Overview, as this does.
const Overview = () => <MobileOverview kpisState={useMobileKpis('shop-mobile')} />;

const renderPage = () => render(<Overview />, { wrapper: Wrapper });

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
  jest.mocked(useFormatters).mockReturnValue(createFormatters(createUiSettingsMock()));
  jest.mocked(useUpdateUrlQuery).mockReturnValue(updateUrlQuery);
  mockParams();
});

describe('MobileOverview', () => {
  it('shows the KPIs that have data: sessions, users and error rate, in order', async () => {
    renderPage();

    expect(await screen.findByTestId('digitalExperienceMobileKpiSessionsValue')).toHaveTextContent(
      '12'
    );
    expect(screen.getByTestId('digitalExperienceMobileKpiUsersValue')).toHaveTextContent('4');
    expect(screen.getByTestId('digitalExperienceMobileKpiErrorRateValue')).toHaveTextContent('0.5');
    expect(
      Array.from(
        screen
          .getByTestId('digitalExperienceMobileKpis')
          .querySelectorAll('[data-test-subj$="Value"]'),
        (value) => value.getAttribute('data-test-subj')
      )
    ).toEqual([
      'digitalExperienceMobileKpiSessionsValue',
      'digitalExperienceMobileKpiUsersValue',
      'digitalExperienceMobileKpiErrorRateValue',
    ]);
  });

  it('shows no crash-free card nor placeholder sections until the sibling issues fill them', async () => {
    renderPage();
    await screen.findByTestId('digitalExperienceMobileKpis');

    expect(screen.queryByTestId('digitalExperienceMobileKpiCrashFree')).toBeNull();
    expect(screen.queryByText('Not enough data')).toBeNull();
    expect(screen.queryByText('Coming soon')).toBeNull();
    expect(
      document.querySelector('[data-test-subj^="digitalExperienceMobileSection-"]')
    ).toBeNull();
  });

  it('leaves Open in Discover to the page header, out of the KPI row', async () => {
    renderPage();
    await screen.findByTestId('digitalExperienceMobileKpis');

    expect(screen.queryByText('Open in Discover')).toBeNull();
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
    expect(screen.queryByTestId('digitalExperienceMobileClearFilters')).toBeNull();
  });

  it('names both the filters and the access when nothing readable matched the filters', async () => {
    mockParams({ release: '9.9.9' });
    fetch.mockResolvedValue({ ...KPIS, hasData: false, isPartial: true });
    renderPage();

    expect(await screen.findByTestId('digitalExperienceMobileUnreadableData')).toHaveTextContent(
      'Nothing matched the filters in the indices you can read. Change the filters'
    );
  });

  it('hides the empty prompt while the KPIs of new filters load', async () => {
    mockParams({ release: '9.9.9' });
    fetch.mockResolvedValue({ ...KPIS, hasData: false, isPartial: true });
    const { rerender } = renderPage();
    await screen.findByTestId('digitalExperienceMobileUnreadableData');

    fetch.mockReturnValue(new Promise(() => {}));
    mockParams({ release: '2.0.0' });
    rerender(<Overview />);

    await waitFor(() =>
      expect(screen.queryByTestId('digitalExperienceMobileUnreadableData')).toBeNull()
    );
  });

  it('shows no access warning when the user reads every index', async () => {
    renderPage();
    await screen.findByTestId('digitalExperienceMobileKpiSessionsValue');

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

  it('lists each OS and release with its sessions, as the Sessions list does its facets', async () => {
    renderPage();
    await screen.findByTestId('digitalExperienceMobileKpis');

    expect(
      filterProps('digitalExperienceMobileOsFilter')?.options.map(({ label }) => label)
    ).toEqual(['Any', 'iOS (6)', 'iPadOS (2)', 'Android (4)']);
    expect(
      filterProps('digitalExperienceMobileReleaseFilter')?.options.map(({ label }) => label)
    ).toEqual(['Any', '2.0.0 (8)', '1.9.0 (4)']);
  });

  it('caps the OS and release buttons, so picking a long value never moves the toolbar', async () => {
    mockParams({ osName: 'iPadOS', release: 'a-very-long-release-name-from-a-nightly-build' });
    renderPage();
    await screen.findByTestId('digitalExperienceMobileKpis');

    ['digitalExperienceMobileOsFilter', 'digitalExperienceMobileReleaseFilter'].forEach((filter) =>
      expect(filterProps(filter)).toMatchObject({ maxButtonInlineSize: '12em', isActive: true })
    );
  });

  it('shows the environment filter loading only until its first options, not on every filter change', async () => {
    const environmentProps = () => jest.mocked(EnvironmentFilter).mock.calls.at(-1)?.[0];
    const { rerender } = renderPage();
    expect(environmentProps()).toMatchObject({ isLoading: true, environments: [] });
    await screen.findByTestId('digitalExperienceMobileKpis');
    expect(environmentProps()).toMatchObject({ isLoading: false, environments: ['production'] });

    // A new OS loads: the picker keeps its options without a spinner.
    fetch.mockReturnValue(new Promise(() => {}));
    mockParams({ osName: 'iOS' });
    rerender(<Overview />);
    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({ query: expect.objectContaining({ osName: 'iOS' }) }),
        })
      )
    );
    expect(environmentProps()).toMatchObject({ isLoading: false, environments: ['production'] });
  });

  it('shows no change nor previous period with Compare off, its default', async () => {
    renderPage();
    await screen.findByTestId('digitalExperienceMobileKpis');

    ['Sessions', 'Users', 'ErrorRate'].forEach((kpi) => {
      expect(screen.queryByTestId(`digitalExperienceMobileKpi${kpi}Change`)).toBeNull();
      expect(screen.queryByTestId(`digitalExperienceMobileKpi${kpi}Previous`)).toBeNull();
    });
  });

  it('shows the change and the previous period on every KPI with Compare on in the URL', async () => {
    mockParams({ compare: 'true' });
    renderPage();
    await screen.findByTestId('digitalExperienceMobileKpis');

    expect(screen.getByTestId('digitalExperienceMobileKpiSessionsChange')).toHaveTextContent(
      '+20%'
    );
    expect(screen.getByTestId('digitalExperienceMobileKpiSessionsPrevious')).toHaveTextContent(
      'Previous period: 10'
    );
    ['Users', 'ErrorRate'].forEach((kpi) => {
      expect(screen.getByTestId(`digitalExperienceMobileKpi${kpi}Change`)).toBeInTheDocument();
      expect(screen.getByTestId(`digitalExperienceMobileKpi${kpi}Previous`)).toBeInTheDocument();
    });
  });

  it("shows neither the previous filters' values nor their access warning while new ones load", async () => {
    mockParams({ compare: 'true' });
    fetch.mockResolvedValue({ ...KPIS, isPartial: true });
    const { rerender } = renderPage();
    await screen.findByTestId('digitalExperienceMobileKpisPartialAccess');
    expect(screen.getByTestId('digitalExperienceMobileKpiSessionsPrevious')).toBeInTheDocument();

    fetch.mockReturnValue(new Promise(() => {}));
    mockParams({ release: '2.0.0', compare: 'true' });
    rerender(<Overview />);

    await waitFor(() =>
      expect(screen.queryByTestId('digitalExperienceMobileKpiSessionsPrevious')).toBeNull()
    );
    expect(screen.queryByTestId('digitalExperienceMobileKpiSessionsChange')).toBeNull();
    expect(screen.queryByTestId('digitalExperienceMobileKpisPartialAccess')).toBeNull();
    // The pickers keep the options of the last response, not only the selected one.
    expect(
      filterProps('digitalExperienceMobileReleaseFilter')?.options.map(({ value }) => value)
    ).toEqual(['', '2.0.0', '1.9.0']);
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
    expect(screen.queryByTestId('digitalExperienceMobileNoMatches')).toBeNull();
    expect(screen.queryByTestId('digitalExperienceMobileClearFilters')).toBeNull();
  });

  it.each([
    ['an OS and a release', { osName: 'iOS', release: '2.0.0' }, undefined],
    ['an environment', {}, 'production'],
  ])(
    'says nothing matched, with a way to clear the filters, not the setup docs, for %s',
    async (_, params, environment) => {
      mockParams(params);
      jest.mocked(useEnvironment).mockReturnValue({ environment, setEnvironment: jest.fn() });
      fetch.mockResolvedValue({ ...KPIS, hasData: false });
      renderPage();

      expect(await screen.findByTestId('digitalExperienceMobileNoMatches')).toHaveTextContent(
        'No mobile data matches the filters'
      );
      // It only knows the filtered query found nothing, not that the app has data otherwise.
      expect(screen.getByTestId('digitalExperienceMobileNoMatches')).not.toHaveTextContent(
        'This application has mobile data'
      );
      expect(screen.queryByTestId('digitalExperienceMobileEmpty')).toBeNull();
      expect(screen.queryByTestId('digitalExperienceMobileAndroidDocsLink')).toBeNull();

      fireEvent.click(screen.getByTestId('digitalExperienceMobileClearFilters'));
      // Every filter in one history entry.
      expect(updateUrlQuery).toHaveBeenCalledTimes(1);
      expect(updateUrlQuery).toHaveBeenCalledWith({
        environment: undefined,
        osName: undefined,
        release: undefined,
      });
    }
  );

  it('offers to clear the filters when nothing readable matched them', async () => {
    mockParams({ release: '9.9.9' });
    fetch.mockResolvedValue({ ...KPIS, hasData: false, isPartial: true });
    renderPage();

    await screen.findByTestId('digitalExperienceMobileUnreadableData');
    expect(screen.queryByTestId('digitalExperienceMobileNoMatches')).toBeNull();
    fireEvent.click(screen.getByTestId('digitalExperienceMobileClearFilters'));
    expect(updateUrlQuery).toHaveBeenCalledWith({
      environment: undefined,
      osName: undefined,
      release: undefined,
    });
  });
});
