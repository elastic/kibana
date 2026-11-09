/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AppHeaderBadge } from '@kbn/app-header';
import { inventoryTitle } from '../../../translations';
import type { MetricsDetailAppHeader } from '../../../pages/metrics/header/metrics_detail_app_header';
import type { getHostHeaderBadges } from '../header/host_header_title';
import { Page } from './page';

type MetricsDetailAppHeaderProps = React.ComponentProps<typeof MetricsDetailAppHeader>;
type GetHostHeaderBadgesArgs = Parameters<typeof getHostHeaderBadges>[0];

const overviewTab = {
  id: 'overview',
  label: 'Overview',
  isSelected: true,
  onClick: jest.fn(),
  'data-test-subj': 'infraAssetDetailsOverviewTab',
};

const hostBadges: AppHeaderBadge[] = [
  {
    label: 'Host details',
    renderCustomBadge: () => <div data-test-subj="hostHeaderExtras" />,
  },
];

const mockGetBreadcrumbOptions = jest.fn(() => ({
  text: inventoryTitle,
  link: { href: '/app/metrics/inventory' },
}));

const mockUseAssetDetailsRenderPropsContext = jest.fn();
const mockGetHostHeaderBadges = jest.fn((_args: GetHostHeaderBadgesArgs) => hostBadges);

// The Page composes the header; rendering the real `AppHeader` tree is covered by
// `metrics_detail_app_header.test.tsx`, so capture the props here instead of mounting it.
let lastMetricsDetailAppHeaderProps: MetricsDetailAppHeaderProps | undefined;

jest.mock('../../../pages/metrics/header/metrics_detail_app_header', () => ({
  MetricsDetailAppHeader: (props: MetricsDetailAppHeaderProps) => {
    lastMetricsDetailAppHeaderProps = props;
    return <div data-test-subj="metricsDetailAppHeader" />;
  },
}));

jest.mock('../../../hooks/use_metrics_breadcrumbs', () => ({
  useMetricsBreadcrumbs: jest.fn(),
}));

jest.mock('../../../hooks/use_parent_breadcrumb_resolver', () => ({
  useParentBreadcrumbResolver: () => ({
    getBreadcrumbOptions: () => mockGetBreadcrumbOptions(),
  }),
}));

jest.mock('../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: {
      telemetry: { reportAssetDetailsPageViewed: jest.fn() },
    },
  }),
}));

jest.mock('../hooks/use_metadata_state', () => ({
  useMetadataStateContext: () => ({
    metadata: { hasSystemIntegration: true },
    loading: false,
  }),
}));

jest.mock('../hooks/use_asset_details_render_props', () => ({
  useAssetDetailsRenderPropsContext: () => mockUseAssetDetailsRenderPropsContext(),
}));

jest.mock('../hooks/use_host_attachment_config', () => ({
  useHostAttachmentConfig: jest.fn(),
}));

jest.mock('../hooks/use_page_header', () => ({
  usePageHeader: () => ({
    rightSideItems: [],
    tabEntries: [],
    appHeaderTabs: [overviewTab],
    breadcrumbs: [],
  }),
}));

jest.mock('../hooks/use_tab_switcher', () => ({
  useTabSwitcherContext: () => ({
    activeTabId: 'overview',
    showTab: jest.fn(),
    renderedTabsSet: { current: new Set(['overview']) },
  }),
}));

jest.mock('../hooks/use_date_picker', () => ({
  useDatePickerContext: () => ({
    dateRange: { from: 'now-15m', to: 'now' },
    setDateRange: jest.fn(),
  }),
}));

jest.mock('../hooks/use_profiling_kuery', () => ({
  useProfilingKuery: () => ({
    customKuery: '',
    setCustomKuery: jest.fn(),
  }),
}));

jest.mock('../date_picker/date_picker', () => ({
  DatePicker: () => <div data-test-subj="assetDetailsDatePicker" />,
}));

jest.mock('../content/content', () => ({
  Content: () => <div data-test-subj="assetDetailsContent" />,
}));

jest.mock('../header/host_header_title', () => ({
  getHostHeaderBadges: (args: GetHostHeaderBadgesArgs) => mockGetHostHeaderBadges(args),
}));

let lastInfraPageTemplateProps: {
  onboardingFlow?: string;
  hasDataOverride?: boolean;
  header?: React.ReactNode;
} = {};

jest.mock('../../shared/templates/infra_page_template', () => ({
  InfraPageTemplate: ({
    children,
    header,
    onboardingFlow,
    hasDataOverride,
  }: {
    children: React.ReactNode;
    header?: React.ReactNode;
    onboardingFlow?: string;
    hasDataOverride?: boolean;
  }) => {
    lastInfraPageTemplateProps = { onboardingFlow, hasDataOverride, header };
    return (
      <div data-test-subj="infraPageTemplate">
        {header}
        {children}
      </div>
    );
  },
}));

const renderPage = () => render(<Page tabs={[]} />);

describe('Asset details Page', () => {
  beforeEach(() => {
    lastInfraPageTemplateProps = {};
    lastMetricsDetailAppHeaderProps = undefined;
    mockGetHostHeaderBadges.mockClear();
    mockGetBreadcrumbOptions.mockReturnValue({
      text: inventoryTitle,
      link: { href: '/app/metrics/inventory' },
    });
    mockUseAssetDetailsRenderPropsContext.mockReturnValue({
      entity: { id: 'web-01', name: 'web-01', type: 'host' },
      loading: false,
      schema: 'ecs',
    });
  });

  it('renders the AppHeader with the asset name and tabs, without a page-local return button', () => {
    renderPage();

    expect(screen.getByTestId('metricsDetailAppHeader')).toBeInTheDocument();
    expect(lastMetricsDetailAppHeaderProps).toEqual(
      expect.objectContaining({ title: 'web-01', tabs: [overviewTab] })
    );
    expect(screen.getByTestId('assetDetailsContent')).toBeInTheDocument();
    expect(screen.getByTestId('assetDetailsDatePicker')).toBeInTheDocument();
    expect(screen.queryByTestId('infraAssetDetailsReturnButton')).not.toBeInTheDocument();
    expect(lastInfraPageTemplateProps.onboardingFlow).toBeUndefined();
    expect(lastInfraPageTemplateProps.hasDataOverride).toBe(true);
  });

  it('passes host extras to the AppHeader as badges instead of the title string', () => {
    renderPage();

    expect(mockGetHostHeaderBadges).toHaveBeenCalledWith({ title: 'web-01', schema: 'ecs' });
    expect(lastMetricsDetailAppHeaderProps?.title).toBe('web-01');
    expect(lastMetricsDetailAppHeaderProps?.badges).toBe(hostBadges);
  });

  it('omits host badges for non-host entities', () => {
    mockUseAssetDetailsRenderPropsContext.mockReturnValue({
      entity: { id: 'pod-01', name: 'pod-01', type: 'pod' },
      loading: false,
      schema: 'ecs',
    });

    renderPage();

    expect(mockGetHostHeaderBadges).not.toHaveBeenCalled();
    expect(lastMetricsDetailAppHeaderProps).toEqual(
      expect.objectContaining({ title: 'pod-01', badges: undefined })
    );
  });
});
