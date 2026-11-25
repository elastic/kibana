/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render as rtlRender, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { useRouteBreadcrumb } from '../../../breadcrumbs/use_route_breadcrumb';
import { useApplicationLinks } from '../../../hooks/use_application_links';
import { useShareAction } from '../../../hooks/use_share_action';
import { MobileApplicationPage } from './mobile_application_page';
import { MobileCrashesTab } from '../mobile_crashes/mobile_crashes_tab';
import { MobileOverview } from './mobile_overview';
import { useMobileReleases } from './release_health/use_mobile_releases';
import type { MobileReleasesState } from './release_health/use_mobile_releases';
import { useMobileDiscoverHref } from './use_mobile_discover_href';
import { useMobileKpis } from './use_mobile_kpis';
import type { MobileKpisState } from './use_mobile_kpis';

const historyReplace = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ replace: historyReplace }),
}));
jest.mock('../../../breadcrumbs/use_route_breadcrumb');
jest.mock('../../../hooks/use_applications_href', () => ({
  useApplicationsHref: () => '/app/digital_experience/?rangeFrom=now-7d&rangeTo=now',
}));
jest.mock('../../../hooks/use_application_links');
jest.mock('../../../hooks/use_share_action');
jest.mock('./use_mobile_discover_href');
jest.mock('./use_mobile_kpis');
jest.mock('./release_health/use_mobile_releases');
jest.mock('./mobile_overview', () => ({
  MobileOverview: jest.fn(() => <div data-test-subj="mobileOverview" />),
}));
jest.mock('../mobile_crashes/mobile_crashes_tab', () => ({
  MobileCrashesTab: jest.fn(() => <div data-test-subj="mobileCrashesTab" />),
}));

const OVERVIEW_PATH = '/shop-mobile?applicationType=mobile&source=otel';
const DISCOVER_HREF = '/app/discover#/?_a=(query:(esql:mobile))';

// EUI's theme too, which the header's actions read.
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiProvider>
    <MockAppHeaderProvider>{children}</MockAppHeaderProvider>
  </EuiProvider>
);

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: Wrapper });

const KPIS_STATE: MobileKpisState = {
  kpis: {
    hasData: true,
    isPartial: false,
    sessions: { value: 4, previous: 2, delta: 2 },
    users: { value: 3, previous: 3, delta: 0 },
    errorRate: { value: 0.25, previous: null, delta: null },
    releases: [{ key: '1.0.0', count: 4 }],
    osNames: [{ key: 'Android', count: 2 }],
    platforms: ['android', 'ios'],
    environments: ['production'],
  },
  currentKpis: undefined,
  isLoading: false,
  error: undefined,
  refresh: jest.fn(),
};

const RELEASES_STATE: MobileReleasesState = {
  releases: undefined,
  isLoading: true,
  error: undefined,
  refresh: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useApplicationLinks).mockReturnValue({
    overviewHref: '/overview-href',
    overviewPath: OVERVIEW_PATH,
    errorsHref: '/errors-href',
    networkHref: '/network-href',
    reportsHref: '/reports-href',
    frustrationHref: '/frustration-href',
    crashesHref: '/crashes-href',
    sessionsHref: () => '/sessions-href',
    sessionHref: () => '/session-href',
  });
  jest.mocked(useMobileDiscoverHref).mockReturnValue(DISCOVER_HREF);
  jest.mocked(useMobileKpis).mockReturnValue(KPIS_STATE);
  jest.mocked(useMobileReleases).mockReturnValue(RELEASES_STATE);
});

describe('MobileApplicationPage', () => {
  it('renders the application name as the title, with a back link to the Applications list', () => {
    render(<MobileApplicationPage serviceName="shop-mobile" selectedTab="overview" />);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('shop-mobile');
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute(
      'href',
      '/app/digital_experience/?rangeFrom=now-7d&rangeTo=now'
    );
    expect(useApplicationLinks).toHaveBeenCalledWith('shop-mobile', 'otel');
  });

  it('has the Overview and Crashes tabs, and the selected one in the breadcrumb', () => {
    render(<MobileApplicationPage serviceName="shop-mobile" selectedTab="overview" />);

    expect(screen.getByTestId('digitalExperienceTab-overview')).toHaveAttribute(
      'href',
      '/overview-href'
    );
    expect(screen.getByTestId('digitalExperienceTab-crashes')).toHaveAttribute(
      'href',
      '/crashes-href'
    );
    ['errors', 'network', 'sessions', 'reports'].forEach((tab) =>
      expect(screen.queryByTestId(`digitalExperienceTab-${tab}`)).toBeNull()
    );
    expect(useRouteBreadcrumb).toHaveBeenCalledWith([
      { text: 'shop-mobile', href: '/overview-href' },
      { text: 'Overview' },
    ]);
  });

  it("puts Open in Discover in the header, with the link to the page's events", async () => {
    render(<MobileApplicationPage serviceName="shop-mobile" selectedTab="overview" />);
    await openAppMenuOverflow();

    const discover = screen.getByTestId('digitalExperienceMobileOpenInDiscover');
    expect(discover).toHaveTextContent('Open in Discover');
    expect(discover).toHaveAttribute('href', DISCOVER_HREF);
    expect(useMobileDiscoverHref).toHaveBeenCalledWith('shop-mobile');
  });

  it('has no Open in Discover without access to Discover', () => {
    jest.mocked(useMobileDiscoverHref).mockReturnValue(undefined);
    render(<MobileApplicationPage serviceName="shop-mobile" selectedTab="overview" />);

    expect(screen.queryByTestId('digitalExperienceMobileOpenInDiscover')).toBeNull();
  });

  it("gives the Overview's Share action to the header", () => {
    const onClick = jest.fn();
    jest.mocked(useShareAction).mockReturnValue({ onClick });
    render(<MobileApplicationPage serviceName="shop-mobile" selectedTab="overview" />);

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    expect(useShareAction).toHaveBeenCalledWith({
      serviceName: 'shop-mobile',
      source: 'otel',
      tab: 'overview',
    });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it.each(['sessions', 'errors', 'network', 'reports'] as const)(
    "replaces a web application's %s route with the Overview, without rendering it",
    (tab) => {
      render(<MobileApplicationPage serviceName="shop-mobile" selectedTab={tab} />);

      expect(historyReplace).toHaveBeenCalledWith(OVERVIEW_PATH);
      expect(screen.queryByTestId('mobileOverview')).toBeNull();
    }
  );

  it('never redirects the Overview', () => {
    render(<MobileApplicationPage serviceName="shop-mobile" selectedTab="overview" />);

    expect(historyReplace).not.toHaveBeenCalled();
    expect(screen.getByTestId('mobileOverview')).toBeInTheDocument();
  });

  it('shows the platforms the application reported on as header badges', () => {
    render(<MobileApplicationPage serviceName="shop-mobile" selectedTab="overview" />);

    expect(screen.getByTestId('digitalExperienceMobilePlatformBadge-android')).toHaveTextContent(
      'Android'
    );
    expect(screen.getByTestId('digitalExperienceMobilePlatformBadge-ios')).toHaveTextContent('iOS');
  });

  it('shows no platform badges before the first response', () => {
    jest.mocked(useMobileKpis).mockReturnValue({ ...KPIS_STATE, kpis: undefined, isLoading: true });
    render(<MobileApplicationPage serviceName="shop-mobile" selectedTab="overview" />);

    expect(screen.queryByTestId('digitalExperienceMobilePlatformBadge-android')).toBeNull();
    expect(useMobileKpis).toHaveBeenCalledWith('shop-mobile');
  });

  it("leaves Compare to the Overview's health summary, out of the header", async () => {
    render(<MobileApplicationPage serviceName="shop-mobile" selectedTab="overview" />);
    await openAppMenuOverflow();

    expect(screen.queryByTestId('digitalExperienceMobileCompareToggle')).toBeNull();
  });

  it('renders the Crashes tab, with the KPIs for its filters, its breadcrumb and Share', () => {
    render(<MobileApplicationPage serviceName="shop-mobile" selectedTab="crashes" />);

    expect(historyReplace).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mobileOverview')).toBeNull();
    expect(jest.mocked(MobileCrashesTab).mock.calls.at(-1)?.[0]).toEqual({
      serviceName: 'shop-mobile',
      kpisState: KPIS_STATE,
    });
    expect(useRouteBreadcrumb).toHaveBeenCalledWith([
      { text: 'shop-mobile', href: '/overview-href' },
      { text: 'Crashes' },
    ]);
    expect(useShareAction).toHaveBeenCalledWith(expect.objectContaining({ tab: 'crashes' }));
  });

  it('gives the Overview the KPIs and the release health the page fetched', () => {
    render(<MobileApplicationPage serviceName="shop-mobile" selectedTab="overview" />);

    expect(jest.mocked(MobileOverview).mock.calls.at(-1)?.[0]).toEqual({
      kpisState: KPIS_STATE,
      releasesState: RELEASES_STATE,
    });
    expect(useMobileReleases).toHaveBeenCalledWith('shop-mobile');
  });
});
