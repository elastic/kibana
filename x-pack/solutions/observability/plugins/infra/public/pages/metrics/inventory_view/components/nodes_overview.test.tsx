/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { InfraFormatterType } from '../../../../common/inventory/types';
import type { InfraWaffleMapOptions } from '../../../../common/inventory/types';
import { NodesOverview } from './nodes_overview';

vi.mock('@kbn/ebt-tools', () => {
      const mocked = {
      usePerformanceContext: () => ({ onPageReady: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@elastic/eui', async () => {
      const mocked = {
      ...(await vi.importActual('@elastic/eui')),
      useCurrentEuiBreakpoint: () => 'l',
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../hooks/use_waffle_options', () => {
      const mocked = {
      useWaffleOptionsContext: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../hooks/use_waffle_time', () => {
      const mocked = {
      useWaffleTimeContext: () => ({ jumpToTime: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../hooks/use_asset_details_flyout_url_state', () => {
      const mocked = {
      useAssetDetailsFlyoutState: () => [{ detailsItemId: null, entityType: null }, vi.fn()],
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../hooks/use_time_range_metadata', () => {
      const mocked = {
      useTimeRangeMetadataContext: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../hooks/use_is_pod_schema_selector_enabled', () => {
      const mocked = {
      useIsPodSchemaSelectorEnabled: vi.fn(() => false),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../components/empty_states', () => {
      const mocked = {
      NoData: ({
        bodyText,
        testString,
        refetchText,
        onRefetch,
      }: {
        bodyText: React.ReactNode;
        testString?: string;
        refetchText?: string;
        onRefetch?: () => void;
      }) => (
        <div data-test-subj={testString}>
          {bodyText}
          {refetchText && onRefetch ? (
            <button type="button" data-test-subj="infraNoDataButton" onClick={onRefetch}>
              {refetchText}
            </button>
          ) : null}
        </div>
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../components/loading', () => {
      const mocked = {
      InfraLoadingPanel: () => <div data-test-subj="infraNodesOverviewLoadingPanel" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./waffle/map', () => {
      const mocked = { Map: () => null };
      return { ...mocked, default: mocked };
    });
vi.mock('./table_view', () => {
      const mocked = { TableView: () => null };
      return { ...mocked, default: mocked };
    });
vi.mock('./waffle/legend', () => {
      const mocked = { Legend: () => null };
      return { ...mocked, default: mocked };
    });
vi.mock('./waffle/asset_details_flyout', () => {
      const mocked = { AssetDetailsFlyout: () => null };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../components/supported_data_tooltip_link', () => {
      const mocked = {
      INTEGRATIONS: {
        pod: { documentation: 'https://example.test/pods' },
        host: { documentation: 'https://example.test/hosts' },
      },
    };
      return { ...mocked, default: mocked };
    });

const mockedUseWaffleOptionsContext =
  // Intentional `as jest.Mock` type assertion as jest.requireMock returns an untyped factory for the waffle options hook;
  (await vi.importMock('../hooks/use_waffle_options')).useWaffleOptionsContext as Mock;
// Intentional `as jest.Mock` type assertion as jest.requireMock returns an untyped factory for time-range metadata;
const mockedUseTimeRangeMetadataContext = (await vi.importMock('../../../../hooks/use_time_range_metadata')).useTimeRangeMetadataContext as Mock;
// Intentional `as jest.Mock` type assertion as jest.requireMock returns an untyped factory for the pod schema flag hook;
const mockedUseIsPodSchemaSelectorEnabled = (await vi.importMock('../../../../hooks/use_is_pod_schema_selector_enabled')).useIsPodSchemaSelectorEnabled as Mock;

const options: InfraWaffleMapOptions = {
  formatter: InfraFormatterType.percent,
  formatTemplate: '{{value}}',
  metric: { type: 'cpu' },
  groupBy: [],
  legend: { type: 'gradient', rules: [] },
  sort: { by: 'name', direction: 'desc' },
};

const baseProps = {
  options,
  nodeType: 'pod' as const,
  nodes: [],
  loading: false,
  onDrilldown: vi.fn(),
  currentTime: Date.now(),
  view: 'map',
  boundsOverride: { min: 0, max: 1 },
  autoBounds: true,
  formatter: (value: string | number) => String(value),
  bottomMargin: 0,
  showLoading: true,
};

const mockPreferredSchema = (preferredSchema: DataSchemaFormat | null) => {
  mockedUseWaffleOptionsContext.mockReturnValue({
    preferredSchema,
  });
};

const mockSchemas = (schemas: DataSchemaFormat[]) => {
  mockedUseTimeRangeMetadataContext.mockReturnValue({
    data: { schemas },
  });
};

const renderOverview = () =>
  render(
    <EuiProvider>
      <I18nProvider>
        <NodesOverview {...baseProps} />
      </I18nProvider>
    </EuiProvider>
  );

describe('NodesOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseIsPodSchemaSelectorEnabled.mockReturnValue(false);
    mockPreferredSchema('semconv');
    mockSchemas(['ecs']);
  });

  it('shows SwitchSchemaMessage for pods when the flag is on and preferredSchema is unavailable', () => {
    mockedUseIsPodSchemaSelectorEnabled.mockReturnValue(true);

    renderOverview();

    expect(screen.getByTestId('noMetricsDataPrompt')).toBeInTheDocument();
    expect(screen.getByTestId('infraInventoryViewNoDataInSelectedSchema')).toBeInTheDocument();
    expect(screen.queryByTestId('infraNoDataButton')).not.toBeInTheDocument();
    expect(mockedUseWaffleOptionsContext()).toEqual(
      expect.objectContaining({ preferredSchema: 'semconv' })
    );
  });

  it('keeps the generic empty state for pods when the flag is off', () => {
    mockedUseIsPodSchemaSelectorEnabled.mockReturnValue(false);

    renderOverview();

    expect(screen.getByTestId('noMetricsDataPrompt')).toBeInTheDocument();
    expect(
      screen.queryByTestId('infraInventoryViewNoDataInSelectedSchema')
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('infraNodesOverviewNoDataSupportedIntegrationLink')
    ).toBeInTheDocument();
    expect(screen.getByTestId('infraNoDataButton')).toBeInTheDocument();
  });
});
