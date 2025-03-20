/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StoryFn, Meta, StoryObj } from '@storybook/react';
import { ThemeProvider, css } from '@emotion/react';
import { ReactFlowProvider } from '@xyflow/react';
import { action } from '@storybook/addon-actions';
import { Controls as ControlsComponent, type ControlsProps } from './controls';

export default {
  title: 'Components/Graph Components/Additional Components',
  description: 'CDR - Graph visualization',
  argTypes: {
    showZoom: {
      control: { type: 'boolean' },
    },
    showFitView: {
      control: { type: 'boolean' },
    },
    showCenter: {
      control: { type: 'boolean' },
    },
  },
} as Meta;

const Template: StoryFn<ControlsProps> = (props) => {
  return (
    <ThemeProvider theme={{ darkMode: false }}>
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
    </ThemeProvider>
  );
};

export const Controls: StoryObj<ControlsProps> = {
  render: Template,

  args: {
    showZoom: true,
    showFitView: true,
    showCenter: true,
  },
};
