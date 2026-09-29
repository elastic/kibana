/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

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
  onClick: vi.fn(),
  'data-test-subj': 'infraAssetDetailsOverviewTab',
};

const hostBadges: AppHeaderBadge[] = [
  {
    label: 'Host details',
    renderCustomBadge: () => <div data-test-subj="hostHeaderExtras" />,
  },
];

const mockGetBreadcrumbOptions = vi.fn(() => ({
  text: inventoryTitle,
  link: { href: '/app/metrics/inventory' },
}));

const mockUseAssetDetailsRenderPropsContext = vi.fn();
const mockGetHostHeaderBadges = vi.fn((_args: GetHostHeaderBadgesArgs) => hostBadges);

// The Page composes the header; rendering the real `AppHeader` tree is covered by
// `metrics_detail_app_header.test.tsx`, so capture the props here instead of mounting it.
let lastMetricsDetailAppHeaderProps: MetricsDetailAppHeaderProps | undefined;

vi.mock('../../../pages/metrics/header/metrics_detail_app_header', () => {
  const mocked = {
    MetricsDetailAppHeader: (props: MetricsDetailAppHeaderProps) => {
      lastMetricsDetailAppHeaderProps = props;
      return <div data-test-subj="metricsDetailAppHeader" />;
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_metrics_breadcrumbs', () => {
  const mocked = {
    useMetricsBreadcrumbs: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_parent_breadcrumb_resolver', () => {
  const mocked = {
    useParentBreadcrumbResolver: () => ({
      getBreadcrumbOptions: () => mockGetBreadcrumbOptions(),
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_kibana', () => {
  const mocked = {
    useKibanaContextForPlugin: () => ({
      services: {
        telemetry: { reportAssetDetailsPageViewed: vi.fn() },
      },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_metadata_state', () => {
  const mocked = {
    useMetadataStateContext: () => ({
      metadata: { hasSystemIntegration: true },
      loading: false,
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_asset_details_render_props', () => {
  const mocked = {
    useAssetDetailsRenderPropsContext: () => mockUseAssetDetailsRenderPropsContext(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_host_attachment_config', () => {
  const mocked = {
    useHostAttachmentConfig: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_page_header', () => {
  const mocked = {
    usePageHeader: () => ({
      rightSideItems: [],
      tabEntries: [],
      appHeaderTabs: [overviewTab],
      breadcrumbs: [],
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_tab_switcher', () => {
  const mocked = {
    useTabSwitcherContext: () => ({
      activeTabId: 'overview',
      showTab: vi.fn(),
      renderedTabsSet: { current: new Set(['overview']) },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_date_picker', () => {
  const mocked = {
    useDatePickerContext: () => ({
      dateRange: { from: 'now-15m', to: 'now' },
      setDateRange: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_profiling_kuery', () => {
  const mocked = {
    useProfilingKuery: () => ({
      customKuery: '',
      setCustomKuery: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../date_picker/date_picker', () => {
  const mocked = {
    DatePicker: () => <div data-test-subj="assetDetailsDatePicker" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../content/content', () => {
  const mocked = {
    Content: () => <div data-test-subj="assetDetailsContent" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../header/host_header_title', () => {
  const mocked = {
    getHostHeaderBadges: (args: GetHostHeaderBadgesArgs) => mockGetHostHeaderBadges(args),
  };
  return { ...mocked, default: mocked };
});

let lastInfraPageTemplateProps: {
  onboardingFlow?: string;
  hasDataOverride?: boolean;
  header?: React.ReactNode;
} = {};

vi.mock('../../shared/templates/infra_page_template', () => {
  const mocked = {
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
  };
  return { ...mocked, default: mocked };
});

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
