/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { EuiThemeProvider as ThemeProvider } from '@elastic/eui';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';
import type { ObservabilityPublicPluginsStart } from '../../plugin';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import { OverviewPage } from './overview';
import type { HasDataMap } from '../../context/has_data_context/has_data_context';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();
const onboardingHref = '/app/observabilityOnboarding';
const onboardingLocator = sharePluginMock.createLocator();
onboardingLocator.useUrl.mockReturnValue(onboardingHref);
vi
  .spyOn(mockUseKibanaReturnValue.services.share.url.locators, 'get')
  .mockReturnValue(onboardingLocator);

vi.mock('../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: vi.fn(() => mockUseKibanaReturnValue),
}));

vi.mock('@kbn/ebt-tools', () => {
      const mocked = {
      usePageReady: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/observability-shared-plugin/public', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/observability-shared-plugin/public')),
      useBreadcrumbs: vi.fn(),
      useFetcher: vi.fn(() => ({ data: undefined })),
      ExternalResourceLinks: () => <div data-test-subj="externalResourceLinks" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../hooks/use_plugin_context');
vi.mock('../../hooks/use_has_data');
vi.mock('../../hooks/use_date_picker_context');
vi.mock('../../hooks/use_time_buckets');

vi.mock('./components/header_actions/header_actions', () => {
      const mocked = {
      HeaderActions: () => <div data-test-subj="overviewHeaderActions" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./components/data_sections', () => {
      const mocked = {
      DATA_SECTIONS: ['alert', 'infra_logs', 'infra_metrics', 'apm', 'ux'],
      DataSections: () => <div data-test-subj="overviewDataSections" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./components/news_feed/news_feed', () => {
      const mocked = {
      NewsFeed: () => <div data-test-subj="overviewNewsFeed" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./components/observability_onboarding_callout', () => {
      const mocked = {
      ObservabilityOnboardingCallout: () => <div data-test-subj="overviewOnboardingCallout" />,
    };
      return { ...mocked, default: mocked };
    });

const { usePluginContext } = (await vi.importMock('../../hooks/use_plugin_context'));
const { useHasData } = (await vi.importMock('../../hooks/use_has_data'));
const { useDatePickerContext } = (await vi.importMock('../../hooks/use_date_picker_context'));
const { useTimeBuckets } = (await vi.importMock('../../hooks/use_time_buckets'));

function completeHasDataMap(overrides: Partial<HasDataMap> = {}): HasDataMap {
  const loaded = { hasData: false, status: FETCH_STATUS.SUCCESS };
  return {
    alert: loaded,
    infra_logs: loaded,
    infra_metrics: loaded,
    apm: loaded,
    ux: loaded,
    synthetics: loaded,
    ...overrides,
  } as HasDataMap;
}

function ObservabilityPageTemplate({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}

function renderOverview() {
  return render(
    <ThemeProvider>
      <IntlProvider locale="en">
        <MockAppHeaderProvider>
          <OverviewPage />
        </MockAppHeaderProvider>
      </IntlProvider>
    </ThemeProvider>
  );
}

describe('OverviewPage header', () => {
  beforeEach(() => {
    usePluginContext.mockReturnValue({
      appMountParameters: {
        setHeaderActionMenu: () => {},
      } as unknown as AppMountParameters,
      config: {
        unsafe: {
          alertDetails: {
            apm: { enabled: false },
            uptime: { enabled: false },
          },
        },
        managedOtlpServiceUrl: '',
        aiAssistant: {
          enabled: false,
          feedback: { enabled: false },
        },
      },
      observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
      ObservabilityPageTemplate,
      kibanaFeatures: [],
      core: {} as CoreStart,
      plugins: {} as ObservabilityPublicPluginsStart,
    });

    useDatePickerContext.mockReturnValue({
      absoluteStart: Date.now() - 3_600_000,
      absoluteEnd: Date.now(),
      relativeStart: 'now-1h',
      relativeEnd: 'now',
      refreshInterval: 0,
      refreshPaused: true,
      updateTimeRange: vi.fn(),
      updateRefreshInterval: vi.fn(),
      lastUpdated: Date.now(),
    });

    useTimeBuckets.mockReturnValue({
      setInterval: vi.fn(),
      getScaledDateFormat: vi.fn(() => 'YYYY-MM-DD'),
    });
  });

  it('renders the Overview title and Add data as the header primary while loading', async () => {
    useHasData.mockReturnValue({
      hasDataMap: completeHasDataMap({
        apm: { hasData: false, status: FETCH_STATUS.LOADING },
      }),
    });

    renderOverview();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Overview');

    const addData = await screen.findByTestId('o11yOverviewHeaderAddDataButton');
    expect(addData).toHaveTextContent('Add data');
    expect(addData).toHaveAttribute('href', onboardingHref);

    expect(screen.getByTestId('obltOverviewPageLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('overviewHeaderActions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('o11yOverviewPageAddDataButton')).not.toBeInTheDocument();
  });

  it('keeps the time picker out of the header when data is present', async () => {
    useHasData.mockReturnValue({
      hasDataMap: completeHasDataMap({
        apm: { hasData: true, status: FETCH_STATUS.SUCCESS },
      }),
    });

    renderOverview();

    const header = screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root);
    expect(within(header).getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Overview'
    );
    expect(
      await within(header).findByTestId('o11yOverviewHeaderAddDataButton')
    ).toBeInTheDocument();
    expect(within(header).queryByTestId('overviewHeaderActions')).not.toBeInTheDocument();

    expect(screen.getByTestId('overviewHeaderActions')).toBeInTheDocument();
    expect(screen.getByTestId('overviewDataSections')).toBeInTheDocument();
  });

  it('keeps the empty-prompt Add data button when there is no data', async () => {
    useHasData.mockReturnValue({
      hasDataMap: completeHasDataMap(),
    });

    renderOverview();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Overview');
    expect(await screen.findByTestId('o11yOverviewHeaderAddDataButton')).toBeInTheDocument();
    expect(screen.getByTestId('obltOverviewNoDataPrompt')).toBeInTheDocument();
    expect(screen.getByTestId('o11yOverviewPageAddDataButton')).toHaveTextContent('Add data');
    expect(screen.queryByTestId('overviewHeaderActions')).not.toBeInTheDocument();
  });
});
