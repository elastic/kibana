/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { css } from '@emotion/react';
import { Graph } from '../graph/graph';
import { GlobalStylesStorybookDecorator } from '../../../.storybook/decorators';
import type { NodeViewModel, EdgeViewModel } from '../types';
import { graphSample } from '../mock/graph_sample';
import { LargeGraph as LargeGraphStory } from '../graph_layout.stories';

type GraphPropsAndCustomArgs = React.ComponentProps<typeof Graph> & {};
type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

export default {
  render({
    nodes,
    edges,
    interactive,
    isLocked,
    showMinimap,
  }: RequiredProps<Partial<GraphPropsAndCustomArgs>, 'nodes' | 'edges'>) {
    return (
      <Graph
        css={css`
          height: 100%;
          width: 100%;
        `}
        showMinimap={showMinimap}
        nodes={nodes}
        edges={edges}
        interactive={interactive ?? false}
        isLocked={isLocked}
      />
    );
  },
  title: 'Components/Graph Components/Minimap',
  argTypes: {},
  parameters: {
    docs: {
      description: {
        component: 'Demonstrates the integration of the Minimap with the Graph component.',
      },
    },
  },
  decorators: [GlobalStylesStorybookDecorator],
} satisfies Meta<typeof Graph>;

export const WithoutMinimap: StoryObj = {
  args: {
    nodes: graphSample.nodes,
    edges: graphSample.edges,
    interactive: true,
    showMinimap: false,
  },
};

export const NoInteractiveGraph: StoryObj = {
  args: {
    nodes: graphSample.nodes,
    edges: graphSample.edges,
    interactive: false,
    showMinimap: true,
  },
};

export const LockedGraph: StoryObj = {
  args: {
    nodes: graphSample.nodes,
    edges: graphSample.edges,
    interactive: true,
    isLocked: true,
    showMinimap: true,
  },
};

export const RegularGraph: StoryObj = {
  args: {
    nodes: graphSample.nodes,
    edges: graphSample.edges,
    interactive: true,
    showMinimap: true,
  },
};

export const LargeGraph: StoryObj = {
  args: {
    ...LargeGraphStory.args,
    showMinimap: true,
    interactive: true,
  },
};

export const UnknownNodesGraph: StoryObj = {
  args: {
    nodes: [
      {
        id: 'unknown',
        shape: 'unknown' as unknown as NodeViewModel['shape'],
        color: 'primary',
      },
    ] as NodeViewModel[],
    edges: [] as EdgeViewModel[],
    interactive: true,
    showMinimap: true,
  },
};
