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
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { InfraFormatterType } from '../../../../common/inventory/types';
import type { InfraWaffleMapOptions } from '../../../../common/inventory/types';
import { NodesOverview } from './nodes_overview';

jest.mock('@kbn/ebt-tools', () => ({
  usePerformanceContext: () => ({ onPageReady: jest.fn() }),
}));

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useCurrentEuiBreakpoint: () => 'l',
}));

jest.mock('../hooks/use_waffle_options', () => ({
  useWaffleOptionsContext: jest.fn(),
}));
jest.mock('../hooks/use_waffle_time', () => ({
  useWaffleTimeContext: () => ({ jumpToTime: jest.fn() }),
}));
jest.mock('../hooks/use_asset_details_flyout_url_state', () => ({
  useAssetDetailsFlyoutState: () => [{ detailsItemId: null, entityType: null }, jest.fn()],
}));
jest.mock('../../../../hooks/use_time_range_metadata', () => ({
  useTimeRangeMetadataContext: jest.fn(),
}));
jest.mock('../../../../hooks/use_is_pod_schema_selector_enabled', () => ({
  useIsPodSchemaSelectorEnabled: jest.fn(() => false),
}));

jest.mock('../../../../components/empty_states', () => ({
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
}));

jest.mock('../../../../components/loading', () => ({
  InfraLoadingPanel: () => <div data-test-subj="infraNodesOverviewLoadingPanel" />,
}));

jest.mock('./waffle/map', () => ({ Map: () => null }));
jest.mock('./table_view', () => ({ TableView: () => null }));
jest.mock('./waffle/legend', () => ({ Legend: () => null }));
jest.mock('./waffle/asset_details_flyout', () => ({ AssetDetailsFlyout: () => null }));

jest.mock('../../../../components/supported_data_tooltip_link', () => ({
  INTEGRATIONS: {
    pod: { documentation: 'https://example.test/pods' },
    host: { documentation: 'https://example.test/hosts' },
  },
}));

const mockedUseWaffleOptionsContext =
  // Intentional `as jest.Mock` type assertion as jest.requireMock returns an untyped factory for the waffle options hook;
  jest.requireMock('../hooks/use_waffle_options').useWaffleOptionsContext as jest.Mock;
// Intentional `as jest.Mock` type assertion as jest.requireMock returns an untyped factory for time-range metadata;
const mockedUseTimeRangeMetadataContext = jest.requireMock(
  '../../../../hooks/use_time_range_metadata'
).useTimeRangeMetadataContext as jest.Mock;
// Intentional `as jest.Mock` type assertion as jest.requireMock returns an untyped factory for the pod schema flag hook;
const mockedUseIsPodSchemaSelectorEnabled = jest.requireMock(
  '../../../../hooks/use_is_pod_schema_selector_enabled'
).useIsPodSchemaSelectorEnabled as jest.Mock;

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
  onDrilldown: jest.fn(),
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
    jest.clearAllMocks();
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
