/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Map } from './map';
import type { SnapshotNode } from '../../../../../../common/http_api/snapshot_api';
import type { InfraWaffleMapOptions } from '../../../../../common/inventory/types';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { InfraFormatterType } from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import type { AutoSizerProps } from '../../../../../components/auto_sizer';
import { EuiProvider } from '@elastic/eui';
import { faker } from '@faker-js/faker';

jest.mock('../../../../../components/auto_sizer', () => ({
  AutoSizer: ({ children }: AutoSizerProps) => {
    return children({
      bounds: { height: 800, width: 1200 },
      content: { height: 800, width: 1200 },
      measureRef: jest.fn(),
    });
  },
}));

const renderWithProviders = (children: React.ReactNode) =>
  render(<EuiProvider>{children}</EuiProvider>);

const createMockNode = (
  cloudProvider?: 'gcp' | 'aws' | 'azure',
  osName?: 'ubuntu' | 'windows'
): SnapshotNode => {
  const name = faker.string.alpha(15);
  const value = faker.number.float();

  return {
    name,
    path: [
      cloudProvider ? { value: cloudProvider, label: cloudProvider } : undefined,
      osName ? { value: osName, label: osName } : undefined,
      { value: name, label: name },
    ].filter((path) => path !== undefined),
    metrics: [
      {
        name: 'cpu',
        value,
        avg: value,
        max: value,
      },
    ],
  };
};

const defaultOptions: InfraWaffleMapOptions = {
  formatter: InfraFormatterType.percent,
  formatTemplate: '{{value}}',
  sort: { by: 'name', direction: 'asc' },
  metric: { type: 'cpu' },
  groupBy: [],
  legend: {
    type: 'gradient',
    rules: [],
  },
};

const defaultProps = {
  nodeType: 'host' as InventoryItemType,
  formatter: (value: string | number) => `${value}`,
  currentTime: Date.now(),
  onFilter: jest.fn(),
  bounds: { min: 0, max: 1, legend: { min: 0, max: 1 } },
  bottomMargin: 0,
  staticHeight: false,
  detailsItemId: null,
};

describe('Map sorting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nodes in correct groups when grouped by a single value', () => {
    const nodes = [
      createMockNode('aws'),
      createMockNode('aws'),
      createMockNode('gcp'),
      createMockNode('gcp'),
      createMockNode('azure'),
    ];

    const options: InfraWaffleMapOptions = {
      ...defaultOptions,
      groupBy: [{ field: 'cloud.provider' }],
    };

    renderWithProviders(<Map {...defaultProps} nodes={nodes} options={options} />);

    const groups = screen.getAllByTestId('groupNameButton');

    for (const group of groups) {
      expect(['aws', 'gcp', 'azure']).toContain(group.textContent);
    }
  });

  it('renders nodes in correct groups when grouped by 2 values', () => {
    const nodes = [
      createMockNode('aws', 'ubuntu'),
      createMockNode('aws', 'ubuntu'),
      createMockNode('gcp', 'ubuntu'),
      createMockNode('gcp', 'windows'),
      createMockNode('azure', 'ubuntu'),
    ];

    const options: InfraWaffleMapOptions = {
      ...defaultOptions,
      groupBy: [{ field: 'cloud.provider' }, { field: 'host.os.name' }],
    };

    renderWithProviders(<Map {...defaultProps} nodes={nodes} options={options} />);

    const groups = screen.getAllByTestId('groupNameButton');

    for (const group of groups) {
      expect(['aws', 'gcp', 'azure', 'ubuntu', 'windows']).toContain(group.textContent);
    }

    const ubuntuCount = groups.filter((group) => group.textContent === 'ubuntu').length;
    const windowsCount = groups.filter((group) => group.textContent === 'windows').length;

    expect(ubuntuCount).toBe(3);
    expect(windowsCount).toBe(1);
  });

  it('renders a single all group when no grouping is selected', () => {
    const nodes = [
      createMockNode(),
      createMockNode(),
      createMockNode(),
      createMockNode(),
      createMockNode(),
    ];

    renderWithProviders(<Map {...defaultProps} nodes={nodes} options={defaultOptions} />);

    const groups = screen.getAllByTestId('groupNameButton');
    expect(groups.length).toBe(1);
    expect(groups[0].textContent).toBe('All');
  });
});
