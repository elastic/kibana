/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider, css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiPanel } from '@elastic/eui';
import { Graph } from './graph/graph';
import type { NodeViewModel, EdgeViewModel } from './types';
import { GlobalStylesStorybookDecorator } from '../../.storybook/decorators';

type GraphCenteringStoryProps = React.ComponentProps<typeof Graph> & {
  title?: string;
  description?: string;
};

const meta: Meta<GraphCenteringStoryProps> = {
  title: 'Components/Graph Components/Graph Centering',
  render: ({ title, description, nodes, edges, interactive, isLocked, ...props }) => {
    return (
      <ThemeProvider theme={{ darkMode: false }}>
        <EuiFlexGroup direction="column" gutterSize="m">
          {(title || description) && (
            <EuiFlexItem grow={false}>
              <EuiPanel paddingSize="m">
                {title && (
                  <EuiText>
                    <h3>{title}</h3>
                  </EuiText>
                )}
                {description && (
                  <EuiText size="s" color="subdued">
                    <p>{description}</p>
                  </EuiText>
                )}
              </EuiPanel>
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <Graph
              css={css`
                height: 400px;
                width: 100%;
                border-radius: 6px;
              `}
              nodes={nodes ?? []}
              edges={edges ?? []}
              interactive={interactive ?? true}
              isLocked={isLocked ?? false}
              {...props}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </ThemeProvider>
    );
  },
  argTypes: {
    interactive: {
      control: { type: 'boolean' },
      description: 'Whether the graph is interactive (allows centering and panning)',
    },
    isLocked: {
      control: { type: 'boolean' },
      description: 'Whether the graph is locked (allows centering but prevents panning)',
    },
  },
  args: {
    interactive: true,
    isLocked: false,
  },
  decorators: [GlobalStylesStorybookDecorator],
};

export default meta;
type Story = StoryObj<GraphCenteringStoryProps>;

const createNode = ({
  id,
  hasOriginEvents = false,
  shape = 'ellipse',
  color = 'primary',
}: {
  id: string;
  hasOriginEvents?: boolean;
  shape?: NodeViewModel['shape'];
  color?: NodeViewModel['color'];
}): NodeViewModel =>
  ({
    id,
    label: hasOriginEvents ? `Origin ${id}` : `Regular ${id}`,
    color: hasOriginEvents ? 'danger' : color,
    shape,
    hasOriginEvents,
    icon: shape === 'ellipse' ? 'user' : shape === 'hexagon' ? 'storage' : 'globe',
  } as NodeViewModel);

const createEdge = ({
  id,
  source,
  target,
  color = 'primary',
}: {
  id: string;
  source: string;
  target: string;
  color?: EdgeViewModel['color'];
}): EdgeViewModel => ({
  id,
  source,
  target,
  color,
});

export const NoOriginNodes: Story = {
  args: {
    title: 'No Origin Nodes',
    description:
      'Graph with no origin nodes. The center button is hidden since there are no nodes to center on.',
    nodes: [
      createNode({ id: 'node1A', hasOriginEvents: false, shape: 'ellipse' }),
      createNode({ id: 'node1B', hasOriginEvents: false, shape: 'ellipse' }),
      createNode({ id: 'node2', hasOriginEvents: false, shape: 'hexagon' }),
      createNode({ id: 'node3', hasOriginEvents: false, shape: 'diamond' }),
      createNode({ id: 'node4', hasOriginEvents: false, shape: 'rectangle' }),
    ],
    edges: [
      createEdge({ id: 'edge1A', source: 'node1A', target: 'node2' }),
      createEdge({ id: 'edge1B', source: 'node1B', target: 'node2' }),
      createEdge({ id: 'edge2', source: 'node2', target: 'node3' }),
      createEdge({ id: 'edge3', source: 'node3', target: 'node4' }),
    ],
  },
};

export const SingleOriginNode: Story = {
  args: {
    title: 'Single Origin Node',
    description:
      'Graph with one origin node (red user) and several connected nodes. The center button should focus on the origin node.',
    nodes: [
      createNode({ id: 'node1A', hasOriginEvents: true, shape: 'ellipse' }),
      createNode({ id: 'node1B', hasOriginEvents: false, shape: 'ellipse' }),
      createNode({ id: 'node2', hasOriginEvents: false, shape: 'hexagon' }),
      createNode({ id: 'node3', hasOriginEvents: false, shape: 'diamond' }),
      createNode({ id: 'node4', hasOriginEvents: false, shape: 'rectangle' }),
    ],
    edges: [
      createEdge({ id: 'edge1A', source: 'node1A', target: 'node2' }),
      createEdge({ id: 'edge1B', source: 'node1B', target: 'node2' }),
      createEdge({ id: 'edge2', source: 'node2', target: 'node3' }),
      createEdge({ id: 'edge3', source: 'node3', target: 'node4' }),
    ],
  },
};

export const MultipleOriginNodes: Story = {
  args: {
    title: 'Multiple Origin Nodes',
    description:
      'Graph with multiple origin nodes (red nodes) scattered across the layout. The center button should focus on all origin nodes.',
    nodes: [
      createNode({ id: 'node1A', hasOriginEvents: true, shape: 'ellipse' }),
      createNode({ id: 'node1B', hasOriginEvents: true, shape: 'ellipse' }),
      createNode({ id: 'node2', hasOriginEvents: false, shape: 'hexagon' }),
      createNode({ id: 'node3', hasOriginEvents: false, shape: 'diamond' }),
      createNode({ id: 'node4', hasOriginEvents: false, shape: 'rectangle' }),
    ],
    edges: [
      createEdge({ id: 'edge1A', source: 'node1A', target: 'node2' }),
      createEdge({ id: 'edge1B', source: 'node1B', target: 'node2' }),
      createEdge({ id: 'edge2', source: 'node2', target: 'node3' }),
      createEdge({ id: 'edge3', source: 'node3', target: 'node4' }),
    ],
  },
};

export const NonInteractiveGraph: Story = {
  args: {
    title: 'Non-Interactive Graph',
    description:
      'Graph in non-interactive mode. Controls are hidden since user cannot interact with the graph.',
    interactive: false,
    nodes: [
      createNode({ id: 'node1A', hasOriginEvents: false, shape: 'ellipse' }),
      createNode({ id: 'node1B', hasOriginEvents: false, shape: 'ellipse' }),
      createNode({ id: 'node2', hasOriginEvents: false, shape: 'hexagon' }),
      createNode({ id: 'node3', hasOriginEvents: false, shape: 'diamond' }),
      createNode({ id: 'node4', hasOriginEvents: false, shape: 'rectangle' }),
    ],
    edges: [
      createEdge({ id: 'edge1A', source: 'node1A', target: 'node2' }),
      createEdge({ id: 'edge1B', source: 'node1B', target: 'node2' }),
      createEdge({ id: 'edge2', source: 'node2', target: 'node3' }),
      createEdge({ id: 'edge3', source: 'node3', target: 'node4' }),
    ],
  },
};

export const LockedGraph: Story = {
  args: {
    title: 'Locked graph',
    description:
      'Graph in interactive mode but locked. Controls are visible and nodes are interactive but graph is not pannable',
    interactive: true,
    isLocked: true,
    nodes: [
      createNode({ id: 'node1A', hasOriginEvents: true, shape: 'ellipse' }),
      createNode({ id: 'node1B', hasOriginEvents: true, shape: 'ellipse' }),
      createNode({ id: 'node2', hasOriginEvents: false, shape: 'hexagon' }),
      createNode({ id: 'node3', hasOriginEvents: false, shape: 'diamond' }),
      createNode({ id: 'node4', hasOriginEvents: false, shape: 'rectangle' }),
    ],
    edges: [
      createEdge({ id: 'edge1A', source: 'node1A', target: 'node2' }),
      createEdge({ id: 'edge1B', source: 'node1B', target: 'node2' }),
      createEdge({ id: 'edge2', source: 'node2', target: 'node3' }),
      createEdge({ id: 'edge3', source: 'node3', target: 'node4' }),
    ],
  },
};
