/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { ConditionalToolTip } from './conditional_tooltip';
import type { SnapshotNodeResponse } from '../../../../../../common/http_api';
import type { InfraWaffleMapNode } from '../../../../../common/inventory/types';

jest.mock('../../../../../containers/metrics_source', () => ({
  useSourceContext: () => ({ sourceId: 'default' }),
}));

jest.mock('../../../../../containers/plugin_config_context');
jest.mock('../../hooks/use_snaphot');
import type { UseSnapshotRequest } from '../../hooks/use_snaphot';
import { useSnapshot } from '../../hooks/use_snaphot';
jest.mock('../../hooks/use_waffle_options');
import { useWaffleOptionsContext } from '../../hooks/use_waffle_options';

const mockedUseSnapshot = useSnapshot as jest.Mock<ReturnType<typeof useSnapshot>>;
const mockedUseWaffleOptionsContext = useWaffleOptionsContext as jest.Mock<
  ReturnType<typeof useWaffleOptionsContext>
>;

const NODE: InfraWaffleMapNode = {
  pathId: 'host-01',
  id: 'host-01',
  name: 'host-01',
  path: [{ value: 'host-01', label: 'host-01' }],
  metrics: [{ name: 'cpuV2' }],
};

const CUSTOM_METRICS = [
  {
    aggregation: 'avg' as const,
    field: 'host.cpuV2.pct',
    id: 'cedd6ca0-5775-11eb-a86f-adb714b6c486',
    label: 'My Custom Label',
    type: 'custom' as const,
  },
  {
    aggregation: 'avg' as const,
    field: 'host.network.out.packets',
    id: 'e12dd700-5775-11eb-a86f-adb714b6c486',
    type: 'custom' as const,
  },
];

const buildWaffleOptions = (preferredSchema: DataSchemaFormat) => ({
  preferredSchema,
  metric: {
    type: 'cpu',
    field: 'host.cpuV2.pct',
    color: 'color0',
    label: 'CPU Usage',
    aggregation: 'avg',
    formatTemplate: '{{value}}%',
  },
  groupBy: [],
  nodeType: 'host',
  view: 'map',
  customOptions: {
    legend: { steps: 10 },
  },
  customMetrics: CUSTOM_METRICS,
  options: {
    fields: {
      cpuV2: { name: 'cpuV2', units: '%' },
      memory: { name: 'memory', units: '%' },
      rxV2: { name: 'rxV2', units: 'bytes' },
      txV2: { name: 'txV2', units: 'bytes' },
      cpu: { name: 'cpu', units: '%' },
      rx: { name: 'rx', units: 'bytes' },
      tx: { name: 'tx', units: 'bytes' },
    },
  },
  setWaffleOptions: jest.fn(),
});

const buildBaseSnapshotResponse = (metricNames: string[]): ReturnType<typeof useSnapshot> => ({
  nodes: [
    {
      name: 'host-01',
      path: [{ label: 'host-01', value: 'host-01', ip: '192.168.1.10' }],
      metrics: metricNames.map((name) => ({
        name,
        value: 0.1,
        avg: 0.4,
        max: 0.7,
      })),
    },
  ],
  error: null,
  loading: false,
  interval: '60s',
  reload: jest.fn(() => Promise.resolve({} as SnapshotNodeResponse)),
});

describe('ConditionalToolTip', () => {
  const currentTime = Date.now();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the ECS metric set (including legacy cpu/tx/rx) when preferredSchema=ecs', () => {
    mockedUseSnapshot.mockReturnValue(
      buildBaseSnapshotResponse([
        'cpuV2',
        'cpu',
        'memory',
        'rxV2',
        'txV2',
        'rx',
        'tx',
        ...CUSTOM_METRICS.map((m) => m.id),
      ])
    );
    mockedUseWaffleOptionsContext.mockReturnValue(
      buildWaffleOptions('ecs') as unknown as ReturnType<typeof useWaffleOptionsContext>
    );

    render(<ConditionalToolTip currentTime={currentTime} node={NODE} nodeType="host" />);

    const tooltip = screen.getByTestId('conditionalTooltipContent-host-01');
    expect(tooltip).toBeInTheDocument();

    const expectedMetrics = [
      { type: 'cpuV2' },
      { type: 'memory' },
      { type: 'txV2' },
      { type: 'rxV2' },
      { type: 'cpu' },
      { type: 'tx' },
      { type: 'rx' },
      ...CUSTOM_METRICS,
    ];

    expect(mockedUseSnapshot).toHaveBeenCalledWith({
      kuery: '"host.name": host-01',
      metrics: expectedMetrics,
      groupBy: [],
      nodeType: 'host',
      sourceId: 'default',
      includeTimeseries: true,
      currentTime,
      accountId: '',
      region: '',
      schema: 'ecs',
    } as UseSnapshotRequest);

    expect(tooltip).toMatchSnapshot();
  });

  it('renders only the semconv metric set (no legacy cpu/tx/rx) when preferredSchema=semconv', () => {
    mockedUseSnapshot.mockReturnValue(
      buildBaseSnapshotResponse([
        'cpuV2',
        'memory',
        'txV2',
        'rxV2',
        ...CUSTOM_METRICS.map((m) => m.id),
      ])
    );
    mockedUseWaffleOptionsContext.mockReturnValue(
      buildWaffleOptions('semconv') as unknown as ReturnType<typeof useWaffleOptionsContext>
    );

    render(<ConditionalToolTip currentTime={currentTime} node={NODE} nodeType="host" />);

    const tooltip = screen.getByTestId('conditionalTooltipContent-host-01');
    expect(tooltip).toBeInTheDocument();

    const expectedMetrics = [
      { type: 'cpuV2' },
      { type: 'memory' },
      { type: 'txV2' },
      { type: 'rxV2' },
      ...CUSTOM_METRICS,
    ];

    expect(mockedUseSnapshot).toHaveBeenCalledWith({
      kuery: '"host.name": host-01',
      metrics: expectedMetrics,
      groupBy: [],
      nodeType: 'host',
      sourceId: 'default',
      includeTimeseries: true,
      currentTime,
      accountId: '',
      region: '',
      schema: 'semconv',
    } as UseSnapshotRequest);

    const useSnapshotCall = mockedUseSnapshot.mock.calls[0][0] as UseSnapshotRequest;
    const requestedTypes = useSnapshotCall.metrics.map((m) => m.type);
    expect(requestedTypes).not.toContain('cpu');
    expect(requestedTypes).not.toContain('rx');
    expect(requestedTypes).not.toContain('tx');

    expect(tooltip).toMatchSnapshot();
  });
});
