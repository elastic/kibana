/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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

const mockedUseWaffleOptionsContextReturnValue = {
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
  customMetrics: [
    {
      aggregation: 'avg',
      field: 'host.cpuV2.pct',
      id: 'cedd6ca0-5775-11eb-a86f-adb714b6c486',
      label: 'My Custom Label',
      type: 'custom',
    },
    {
      aggregation: 'avg',
      field: 'host.network.out.packets',
      id: 'e12dd700-5775-11eb-a86f-adb714b6c486',
      type: 'custom',
    },
  ],
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
};

describe('ConditionalToolTip', () => {
  const currentTime = Date.now();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with node data', () => {
    mockedUseSnapshot.mockReturnValue({
      nodes: [
        {
          name: 'host-01',
          path: [{ label: 'host-01', value: 'host-01', ip: '192.168.1.10' }],
          metrics: [
            { name: 'cpuV2', value: 0.1, avg: 0.4, max: 0.7 },
            { name: 'cpu', value: 0.1, avg: 0.4, max: 0.7 },
            { name: 'memory', value: 0.8, avg: 0.8, max: 1 },
            { name: 'rxV2', value: 1000000, avg: 1000000, max: 1000000 },
            { name: 'txV2', value: 1000000, avg: 1000000, max: 1000000 },
            { name: 'rx', value: 1000000, avg: 1000000, max: 1000000 },
            { name: 'tx', value: 1000000, avg: 1000000, max: 1000000 },
            {
              name: 'cedd6ca0-5775-11eb-a86f-adb714b6c486',
              max: 0.34164999922116596,
              value: 0.34140000740687054,
              avg: 0.20920833365784752,
            },
            {
              name: 'e12dd700-5775-11eb-a86f-adb714b6c486',
              max: 4703.166666666667,
              value: 4392.166666666667,
              avg: 3704.6666666666674,
            },
          ],
        },
      ],
      error: null,
      loading: false,
      interval: '60s',
      reload: jest.fn(() => Promise.resolve({} as SnapshotNodeResponse)),
    });
    mockedUseWaffleOptionsContext.mockReturnValue(
      mockedUseWaffleOptionsContextReturnValue as unknown as ReturnType<
        typeof useWaffleOptionsContext
      >
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
      {
        aggregation: 'avg',
        field: 'host.cpuV2.pct',
        id: 'cedd6ca0-5775-11eb-a86f-adb714b6c486',
        label: 'My Custom Label',
        type: 'custom',
      },
      {
        aggregation: 'avg',
        field: 'host.network.out.packets',
        id: 'e12dd700-5775-11eb-a86f-adb714b6c486',
        type: 'custom',
      },
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
    } as UseSnapshotRequest);

    expect(tooltip).toMatchSnapshot();
  });
});
