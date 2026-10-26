/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { css } from '@emotion/react';
import { ReactFlowProvider } from '@xyflow/react';
import { action } from '@storybook/addon-actions';
import { Controls as ControlsComponent, type ControlsProps } from './controls';
import { LayersPanel } from './layers_panel';
import { DEFAULT_GRAPH_DISPLAY_OPTIONS } from '../graph/graph_display_options_context';
import { GlobalStylesStorybookDecorator } from '../../../.storybook/decorators';

export default {
  title: 'Components/Graph Components/Additional Components',
  render: (props) => {
    return (
      <ReactFlowProvider>
        <ControlsComponent
          css={css`
            width: 42px;
          `}
          onZoomIn={action('zoomIn')}
          onZoomOut={action('zoomOut')}
          onFitView={action('fitView')}
          onCenter={action('center')}
          {...props}
        />
      </ReactFlowProvider>
    );
  },
  argTypes: {
    showZoom: {
      control: { type: 'boolean' },
    },
    showFitView: {
      control: { type: 'boolean' },
    },
    nodeIdsToCenterOn: {
      control: { type: 'object' },
      description:
        'Array of origin node IDs (nodes that have isOrigin=true or isOriginAlert=true) the graph must center on',
    },
  },
  decorators: [GlobalStylesStorybookDecorator],
} satisfies Meta<typeof ControlsComponent>;

export const Controls: StoryObj<ControlsProps> = {
  args: {
    showZoom: true,
    showFitView: true,
    nodeIdsToCenterOn: ['node1', 'node2'],
    fitViewOptions: { duration: 200 },
  },
};

const LayersPanelDemo = () => {
  const [displayOptions, setDisplayOptions] = useState(DEFAULT_GRAPH_DISPLAY_OPTIONS);
  return (
    <div
      css={css`
        display: inline-block;
        border: 1px solid #d3dae6;
        border-radius: 6px;
        overflow: hidden;
      `}
    >
      <LayersPanel
        displayOptions={displayOptions}
        onChange={(opts) => {
          action('onChange')(opts);
          setDisplayOptions(opts);
        }}
      />
    </div>
  );
};

/** Standalone Layers panel — shows all toggleable fields and keeps state locally. */
export const Layers: StoryObj = {
  render: () => <LayersPanelDemo />,
};
