/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Node } from '@xyflow/react';
import { TopologyGraph } from './topology_graph';
import type { TopologyViewModel } from './topology_model';

jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  ReactFlow: ({ nodes }: { nodes: Node[] }) => (
    <ul>
      {nodes.map(({ id, position }) => (
        <li key={id}>{`${id}@${position.x},${position.y}`}</li>
      ))}
    </ul>
  ),
}));

const node = (id: string) => ({ id, label: id, unresolved: false });

describe('TopologyGraph', () => {
  it('lays out a node id that shadows an Object.prototype key', () => {
    const model: TopologyViewModel = {
      nodes: [node('api'), node('constructor')],
      edges: [
        {
          id: 'api-constructor:0',
          edgeId: 'api-constructor',
          source: 'api',
          target: 'constructor',
          variant: {
            source_ref: 'api',
            target_ref: 'constructor',
            source_node_id: 'api',
            target_node_id: 'constructor',
            source_resolution: 'slug',
            target_resolution: 'slug',
            provenance: [],
          },
        },
      ],
    };

    render(<TopologyGraph model={model} onSelect={jest.fn()} />);

    const positions = screen.getAllByRole('listitem').map(({ textContent }) => textContent);
    expect(positions).toHaveLength(2);
    positions.forEach((position) => expect(position).not.toMatch(/NaN/));
  });
});
