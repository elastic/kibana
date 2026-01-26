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

// Mock GroupOfNodes to simplify rendering
jest.mock('./group_of_nodes', () => ({
  GroupOfNodes: ({ group }: any) => {
    return (
      <div data-test-subj="groupOfNodes">
        {group.nodes.map((node: any) => (
          <div key={node.id} data-test-subj="nodeContainer">
            <span data-test-subj="nodeName">{node.name}</span>
            <span data-test-subj="nodeValue">{node.metrics?.[0]?.value || 0}</span>
          </div>
        ))}
      </div>
    );
  },
}));

const createMockNode = (name: string, value: number): SnapshotNode => ({
  name,
  path: [{ value: name, label: name }],
  metrics: [
    {
      name: 'cpu',
      value,
      avg: value,
      max: value,
    },
  ],
});

const hostNodes: SnapshotNode[] = [
  createMockNode('host-1', 0.5),
  createMockNode('host-2', 0.7),
  createMockNode('host-3', 0.9),
  createMockNode('host-4', 0.3),
  createMockNode('host-5', 0.1),
];

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
  nodes: hostNodes,
  nodeType: 'host' as InventoryItemType,
  options: defaultOptions,
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

  const getNodeNames = () => {
    const nodeContainers = screen.getAllByTestId('nodeContainer');

    return nodeContainers.map((container) => {
      const nodeName = container.querySelector('[data-test-subj="nodeName"]');
      return nodeName?.textContent || '';
    });
  };

  const getNodeValues = () => {
    const nodeContainers = screen.getAllByTestId('nodeContainer');

    return nodeContainers.map((container) => {
      const nodeValue = container.querySelector('[data-test-subj="nodeValue"]');
      const valueText = nodeValue?.textContent || '';
      return parseFloat(valueText);
    });
  };

  it('renders nodes in correct order when sorted by value descending', () => {
    const options: InfraWaffleMapOptions = {
      ...defaultOptions,
      sort: { by: 'value', direction: 'desc' },
    };

    render(<Map {...defaultProps} options={options} />);

    const nodeNames = getNodeNames();
    const nodeValues = getNodeValues();

    expect(nodeNames).toEqual(['host-3', 'host-2', 'host-1', 'host-4', 'host-5']);
    expect(nodeValues).toEqual([0.9, 0.7, 0.5, 0.3, 0.1]);
  });

  it('renders nodes in correct order when sorted by value ascending', () => {
    const options: InfraWaffleMapOptions = {
      ...defaultOptions,
      sort: { by: 'value', direction: 'asc' },
    };

    render(<Map {...defaultProps} options={options} />);

    const nodeNames = getNodeNames();
    const nodeValues = getNodeValues();

    expect(nodeNames).toEqual(['host-5', 'host-4', 'host-1', 'host-2', 'host-3']);
    expect(nodeValues).toEqual([0.1, 0.3, 0.5, 0.7, 0.9]);
  });

  it('updates node order when sort option changes from desc to asc', () => {
    const { rerender } = render(<Map {...defaultProps} />);

    let nodeNames = getNodeNames();
    let nodeValues = getNodeValues();

    expect(nodeNames).toEqual(['host-1', 'host-2', 'host-3', 'host-4', 'host-5']);
    expect(nodeValues).toEqual([0.5, 0.7, 0.9, 0.3, 0.1]);

    const descOptions: InfraWaffleMapOptions = {
      ...defaultOptions,
      sort: { by: 'value', direction: 'desc' },
    };
    rerender(<Map {...defaultProps} options={descOptions} />);

    nodeNames = getNodeNames();
    nodeValues = getNodeValues();

    expect(nodeNames).toEqual(['host-3', 'host-2', 'host-1', 'host-4', 'host-5']);
    expect(nodeValues).toEqual([0.9, 0.7, 0.5, 0.3, 0.1]);

    const ascOptions: InfraWaffleMapOptions = {
      ...defaultOptions,
      sort: { by: 'value', direction: 'asc' },
    };
    rerender(<Map {...defaultProps} options={ascOptions} />);

    nodeNames = getNodeNames();
    nodeValues = getNodeValues();

    expect(nodeNames).toEqual(['host-5', 'host-4', 'host-1', 'host-2', 'host-3']);
    expect(nodeValues).toEqual([0.1, 0.3, 0.5, 0.7, 0.9]);
  });
});
