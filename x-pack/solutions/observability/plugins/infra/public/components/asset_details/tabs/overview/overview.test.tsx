/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { Overview } from './overview';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useMetadataStateContext } from '../../hooks/use_metadata_state';
import { useDataViewsContext } from '../../hooks/use_data_views';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';

jest.mock('../../../../hooks/use_kibana');
jest.mock('../../hooks/use_metadata_state');
jest.mock('../../hooks/use_data_views');
jest.mock('../../hooks/use_date_picker');
jest.mock('../../hooks/use_asset_details_render_props');

// The sections are stubbed with their own test subjects: this suite covers which sections Overview
// composes, while each section's behavior is covered next to that section.
jest.mock('./kpis/kpi_grid', () => ({
  KPIGrid: () => <div data-test-subj="infraAssetDetailsKPIGrid" />,
}));
jest.mock('./kpis/cpu_profiling_prompt', () => ({
  CpuProfilingPrompt: () => <div data-test-subj="infraAssetDetailsCPUProfilingPrompt" />,
}));
jest.mock('./metadata_summary/metadata_summary_list', () => ({
  MetadataSummaryList: () => <div data-test-subj="infraAssetDetailsMetadataCollapsible" />,
  MetadataSummaryListCompact: () => (
    <div data-test-subj="infraAssetDetailsMetadataCollapsibleCompact" />
  ),
}));
jest.mock('./alerts/alerts', () => ({
  AlertsSummaryContent: () => <div data-test-subj="infraAssetDetailsAlertsCollapsible" />,
}));
jest.mock('./services', () => ({
  ServicesContent: () => <div data-test-subj="infraAssetDetailsServicesCollapsible" />,
}));
jest.mock('./metrics/metrics', () => ({
  MetricsContent: () => <div data-test-subj="infraAssetDetailsMetricsCollapsible" />,
}));

const useKibanaMock = useKibanaContextForPlugin as jest.MockedFunction<
  typeof useKibanaContextForPlugin
>;
const useMetadataStateContextMock = useMetadataStateContext as jest.MockedFunction<
  typeof useMetadataStateContext
>;
const useDataViewsContextMock = useDataViewsContext as jest.MockedFunction<
  typeof useDataViewsContext
>;
const useDatePickerContextMock = useDatePickerContext as jest.MockedFunction<
  typeof useDatePickerContext
>;
const useAssetDetailsRenderPropsContextMock =
  useAssetDetailsRenderPropsContext as jest.MockedFunction<
    typeof useAssetDetailsRenderPropsContext
  >;

const HOST1_NAME = 'host-1';
const DATE_WITH_HOSTS_DATA_FROM = '2023-03-28T18:20:00.000Z';
const DATE_WITH_HOSTS_DATA_TO = '2023-03-28T18:21:00.000Z';

const mockKibana = (canShowApm = true) => {
  useKibanaMock.mockReturnValue({
    services: {
      application: {
        capabilities: {
          apm: { show: canShowApm },
        },
      },
    },
  } as unknown as ReturnType<typeof useKibanaContextForPlugin>);
};

const mockMetadataState = (overrides: Partial<ReturnType<typeof useMetadataStateContext>> = {}) => {
  useMetadataStateContextMock.mockReturnValue({
    metadata: {
      id: HOST1_NAME,
      name: HOST1_NAME,
      features: [],
      info: { host: { os: { name: 'Ubuntu' } } },
    },
    loading: false,
    error: null,
    refresh: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useMetadataStateContext>);
};

const mockRenderProps = ({
  entityType = 'host' as InventoryItemType,
  mode = 'page' as 'page' | 'flyout',
} = {}) => {
  useAssetDetailsRenderPropsContextMock.mockReturnValue({
    entity: {
      id: HOST1_NAME,
      name: HOST1_NAME,
      type: entityType,
    },
    renderMode: { mode },
    schema: 'ecs',
  } as unknown as ReturnType<typeof useAssetDetailsRenderPropsContext>);
};

const renderOverview = () =>
  render(
    <I18nProvider>
      <Overview />
    </I18nProvider>
  );

describe('Overview Tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockKibana();
    mockMetadataState();
    mockRenderProps();

    useDataViewsContextMock.mockReturnValue({
      metrics: { dataView: { id: 'test-id', title: 'test-title' } },
    } as unknown as ReturnType<typeof useDataViewsContext>);

    useDatePickerContextMock.mockReturnValue({
      dateRange: {
        from: DATE_WITH_HOSTS_DATA_FROM,
        to: DATE_WITH_HOSTS_DATA_TO,
      },
    } as unknown as ReturnType<typeof useDatePickerContext>);
  });

  it('composes the host overview from the KPI, metadata, alerts, services and metrics sections', () => {
    renderOverview();

    expect(screen.getByTestId('infraAssetDetailsKPIGrid')).toBeInTheDocument();
    expect(screen.getByTestId('infraAssetDetailsMetadataCollapsible')).toBeInTheDocument();
    expect(screen.getByTestId('infraAssetDetailsAlertsCollapsible')).toBeInTheDocument();
    expect(screen.getByTestId('infraAssetDetailsServicesCollapsible')).toBeInTheDocument();
    expect(screen.getByTestId('infraAssetDetailsMetricsCollapsible')).toBeInTheDocument();
    expect(screen.getByTestId('infraAssetDetailsCPUProfilingPrompt')).toBeInTheDocument();
  });

  it('uses the compact metadata summary in flyout mode', () => {
    mockRenderProps({ mode: 'flyout' });

    renderOverview();

    expect(screen.getByTestId('infraAssetDetailsMetadataCollapsibleCompact')).toBeInTheDocument();
    expect(screen.queryByTestId('infraAssetDetailsMetadataCollapsible')).not.toBeInTheDocument();
  });

  it('omits the services section when the APM capability is not granted', () => {
    mockKibana(false);

    renderOverview();

    expect(screen.getByTestId('infraAssetDetailsMetadataCollapsible')).toBeInTheDocument();
    expect(screen.queryByTestId('infraAssetDetailsServicesCollapsible')).not.toBeInTheDocument();
  });

  it('omits the services section and CPU profiling prompt for containers', () => {
    mockRenderProps({ entityType: 'container' });

    renderOverview();

    expect(screen.getByTestId('infraAssetDetailsKPIGrid')).toBeInTheDocument();
    expect(screen.getByTestId('infraAssetDetailsAlertsCollapsible')).toBeInTheDocument();
    expect(screen.getByTestId('infraAssetDetailsMetricsCollapsible')).toBeInTheDocument();
    expect(screen.queryByTestId('infraAssetDetailsServicesCollapsible')).not.toBeInTheDocument();
    expect(screen.queryByTestId('infraAssetDetailsCPUProfilingPrompt')).not.toBeInTheDocument();
  });

  it('replaces the metadata section with an error callout when metadata fails to load', () => {
    mockMetadataState({ error: 'boom', metadata: undefined });

    renderOverview();

    expect(screen.getByTestId('infraAssetDetailsMetadataErrorCallout')).toBeInTheDocument();
    expect(screen.queryByTestId('infraAssetDetailsMetadataCollapsible')).not.toBeInTheDocument();
  });

  it('keeps showing the metadata section while metadata is still loading after an error', () => {
    mockMetadataState({ error: 'boom', metadata: undefined, loading: true });

    renderOverview();

    expect(screen.queryByTestId('infraAssetDetailsMetadataErrorCallout')).not.toBeInTheDocument();
    expect(screen.getByTestId('infraAssetDetailsMetadataCollapsible')).toBeInTheDocument();
  });
});
