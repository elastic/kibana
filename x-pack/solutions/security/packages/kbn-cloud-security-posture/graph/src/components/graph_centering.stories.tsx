/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider, css } from '@emotion/react';
import { EuiText, EuiPanel } from '@elastic/eui';
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
        <Graph
          css={css`
            height: calc(100% - 80px);
            width: 100%;
            border-radius: 6px;
          `}
          nodes={nodes ?? []}
          edges={edges ?? []}
          interactive={interactive ?? true}
          isLocked={isLocked ?? false}
          {...props}
        />
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

const createEntityNode = ({
  id,
  shape = 'ellipse',
  color = 'primary',
}: {
  id: string;
  shape?: NodeViewModel['shape'];
  color?: NodeViewModel['color'];
}): NodeViewModel =>
  ({
    id,
    label: `Entity ${id}`,
    color,
    shape,
    isOrigin: false,
    isOriginAlert: false,
    icon:
      shape === 'ellipse'
        ? 'user'
        : shape === 'hexagon'
        ? 'storage'
        : shape === 'diamond'
        ? 'globe'
        : 'globe',
  } as NodeViewModel);

const createLabelNode = ({
  id,
  isOrigin = false,
  isOriginAlert = false,
}: {
  id: string;
  isOrigin?: boolean;
  isOriginAlert?: boolean;
}): NodeViewModel => {
  return {
    id,
    shape: 'label',
    label: id,
    color: isOriginAlert ? 'danger' : 'primary',
    isOrigin,
    isOriginAlert,
  } as NodeViewModel;
};

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
      'Graph with no origin / origin alert label nodes. The center control is hidden since there are no origin nodes.',
    nodes: [
      createEntityNode({ id: 'node1', shape: 'hexagon' }),
      createEntityNode({ id: 'node2', shape: 'diamond' }),
      createEntityNode({ id: 'node3', shape: 'hexagon' }),

      createLabelNode({ id: 'noOriginEvent' }),
      createLabelNode({ id: 'noOriginAlert' }),
    ],
    edges: [
      createEdge({ id: 'node1ToNoOriginEvent', source: 'node1', target: 'noOriginEvent' }),
      createEdge({ id: 'noOriginEventToNode2', source: 'noOriginEvent', target: 'node2' }),

      createEdge({ id: 'node2ToNoOriginAlert', source: 'node2', target: 'noOriginAlert' }),
      createEdge({ id: 'noOriginAlertToNode3', source: 'noOriginAlert', target: 'node3' }),
    ],
  },
};

export const SingleOriginEvent: Story = {
  args: {
    title: 'Single Origin Event',
    description: 'Graph with one origin event',
    nodes: [
      createEntityNode({ id: 'node1', shape: 'hexagon' }),
      createEntityNode({ id: 'node2', shape: 'diamond' }),
      createEntityNode({ id: 'node3', shape: 'hexagon' }),
      createEntityNode({ id: 'node4', shape: 'pentagon' }),

      createLabelNode({ id: 'noOriginEvent' }),
      createLabelNode({ id: 'noOriginAlert' }),
      createLabelNode({ id: 'originEvent', isOrigin: true }),
    ],
    edges: [
      createEdge({ id: 'node1ToNoOriginEvent', source: 'node1', target: 'noOriginEvent' }),
      createEdge({ id: 'noOriginEventToNode2', source: 'noOriginEvent', target: 'node2' }),

      createEdge({ id: 'node2ToNoOriginAlert', source: 'node2', target: 'noOriginAlert' }),
      createEdge({ id: 'noOriginAlertToNode3', source: 'noOriginAlert', target: 'node3' }),

      createEdge({ id: 'node3ToOriginEvent', source: 'node3', target: 'originEvent' }),
      createEdge({ id: 'originEventToNode4', source: 'originEvent', target: 'node4' }),
    ],
  },
};

export const SingleOriginAlert: Story = {
  args: {
    title: 'Single Origin Alert',
    description: 'Graph with one origin alert',
    nodes: [
      createEntityNode({ id: 'node1', shape: 'hexagon' }),
      createEntityNode({ id: 'node2', shape: 'diamond' }),
      createEntityNode({ id: 'node3', shape: 'hexagon' }),
      createEntityNode({ id: 'node4', shape: 'pentagon' }),

      createLabelNode({ id: 'noOriginEvent' }),
      createLabelNode({ id: 'noOriginAlert' }),
      createLabelNode({ id: 'originAlert', isOriginAlert: true }),
    ],
    edges: [
      createEdge({ id: 'node1ToNoOriginEvent', source: 'node1', target: 'noOriginEvent' }),
      createEdge({ id: 'noOriginEventToNode2', source: 'noOriginEvent', target: 'node2' }),

      createEdge({ id: 'node2ToNoOriginAlert', source: 'node2', target: 'noOriginAlert' }),
      createEdge({ id: 'noOriginAlertToNode3', source: 'noOriginAlert', target: 'node3' }),

      createEdge({ id: 'node3ToOriginAlert', source: 'node3', target: 'originAlert' }),
      createEdge({ id: 'originAlertToNode4', source: 'originAlert', target: 'node4' }),
    ],
  },
};

export const MultipleOriginNodes: Story = {
  args: {
    title: 'Multiple origin nodes',
    description: 'Graph with one origin event and one origin alert.',
    nodes: [
      createEntityNode({ id: 'node1', shape: 'hexagon' }),
      createEntityNode({ id: 'node2', shape: 'diamond' }),
      createEntityNode({ id: 'node3', shape: 'hexagon' }),
      createEntityNode({ id: 'node4', shape: 'pentagon' }),
      createEntityNode({ id: 'node5', shape: 'rectangle' }),

      createLabelNode({ id: 'noOriginEvent' }),
      createLabelNode({ id: 'noOriginAlert' }),
      createLabelNode({ id: 'originEvent', isOrigin: true }),
      createLabelNode({ id: 'originAlert', isOriginAlert: true }),
    ],
    edges: [
      createEdge({ id: 'node1ToNoOriginEvent', source: 'node1', target: 'noOriginEvent' }),
      createEdge({ id: 'noOriginEventToNode2', source: 'noOriginEvent', target: 'node2' }),

      createEdge({ id: 'node2ToNoOriginAlert', source: 'node2', target: 'noOriginAlert' }),
      createEdge({ id: 'noOriginAlertToNode3', source: 'noOriginAlert', target: 'node3' }),

      createEdge({ id: 'node3ToOriginEvent', source: 'node3', target: 'originEvent' }),
      createEdge({ id: 'originEventToNode4', source: 'originEvent', target: 'node4' }),

      createEdge({ id: 'node4ToOriginAlert', source: 'node4', target: 'originAlert' }),
      createEdge({ id: 'originAlertToNode5', source: 'originAlert', target: 'node5' }),
    ],
  },
};

export const NonInteractiveGraph: Story = {
  args: {
    title: 'Non-Interactive Graph',
    description:
      'Graph in non-interactive mode. Controls are hidden since the user cannot interact; also no origin label nodes are present.',
    interactive: false,
    nodes: [
      createEntityNode({ id: 'node1', shape: 'hexagon' }),
      createEntityNode({ id: 'node2', shape: 'diamond' }),
      createEntityNode({ id: 'node3', shape: 'hexagon' }),
      createEntityNode({ id: 'node4', shape: 'pentagon' }),
      createEntityNode({ id: 'node5', shape: 'rectangle' }),

      createLabelNode({ id: 'noOriginEvent' }),
      createLabelNode({ id: 'noOriginAlert' }),
      createLabelNode({ id: 'originEvent', isOrigin: true }),
      createLabelNode({ id: 'originAlert', isOriginAlert: true }),
    ],
    edges: [
      createEdge({ id: 'node1ToNoOriginEvent', source: 'node1', target: 'noOriginEvent' }),
      createEdge({ id: 'noOriginEventToNode2', source: 'noOriginEvent', target: 'node2' }),

      createEdge({ id: 'node2ToNoOriginAlert', source: 'node2', target: 'noOriginAlert' }),
      createEdge({ id: 'noOriginAlertToNode3', source: 'noOriginAlert', target: 'node3' }),

      createEdge({ id: 'node3ToOriginEvent', source: 'node3', target: 'originEvent' }),
      createEdge({ id: 'originEventToNode4', source: 'originEvent', target: 'node4' }),

      createEdge({ id: 'node4ToOriginAlert', source: 'node4', target: 'originAlert' }),
      createEdge({ id: 'originAlertToNode5', source: 'originAlert', target: 'node5' }),
    ],
  },
};

export const LockedGraph: Story = {
  args: {
    title: 'Locked graph',
    description:
      'Interactive but locked graph (panning disabled) with one origin event and origin alert',
    interactive: true,
    isLocked: true,
    nodes: [
      createEntityNode({ id: 'node1', shape: 'hexagon' }),
      createEntityNode({ id: 'node2', shape: 'diamond' }),
      createEntityNode({ id: 'node3', shape: 'hexagon' }),
      createEntityNode({ id: 'node4', shape: 'pentagon' }),
      createEntityNode({ id: 'node5', shape: 'rectangle' }),

      createLabelNode({ id: 'noOriginEvent' }),
      createLabelNode({ id: 'noOriginAlert' }),
      createLabelNode({ id: 'originEvent', isOrigin: true }),
      createLabelNode({ id: 'originAlert', isOriginAlert: true }),
    ],
    edges: [
      createEdge({ id: 'node1ToNoOriginEvent', source: 'node1', target: 'noOriginEvent' }),
      createEdge({ id: 'noOriginEventToNode2', source: 'noOriginEvent', target: 'node2' }),

      createEdge({ id: 'node2ToNoOriginAlert', source: 'node2', target: 'noOriginAlert' }),
      createEdge({ id: 'noOriginAlertToNode3', source: 'noOriginAlert', target: 'node3' }),

      createEdge({ id: 'node3ToOriginEvent', source: 'node3', target: 'originEvent' }),
      createEdge({ id: 'originEventToNode4', source: 'originEvent', target: 'node4' }),

      createEdge({ id: 'node4ToOriginAlert', source: 'node4', target: 'originAlert' }),
      createEdge({ id: 'originAlertToNode5', source: 'originAlert', target: 'node5' }),
    ],
  },
};
