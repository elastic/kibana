/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { ThemeProvider, css } from '@emotion/react';
import type { Meta, StoryObj } from '@storybook/react';
import type { EntityNodeViewModel, LabelNodeViewModel } from '..';
import { Graph } from '..';
import { GlobalStylesStorybookDecorator } from '../../../.storybook/decorators';

export default {
  title: 'Components/Graph Components/Node',
  argTypes: {},
  decorators: [GlobalStylesStorybookDecorator],
} satisfies Meta<typeof Graph>;

const Template = () => {
  const nodes: Array<EntityNodeViewModel | LabelNodeViewModel> = useMemo(
    () => [
      ...(
        ['hexagon', 'ellipse', 'rectangle', 'pentagon', 'diamond'] as const
      ).map<EntityNodeViewModel>((shape, idx) => ({
        id: `entity-${idx}`,
        tag: `Tag ${idx}`,
        label: `Entity node ${idx}`,
        color: 'primary',
        icon: 'okta',
        interactive: true,
        shape,
      })),
      {
        id: 'label',
        tag: 'Tag 5',
        label: 'Node 5',
        color: 'primary',
        interactive: true,
        shape: 'label',
      } as LabelNodeViewModel,
    ],

    []
  );

  return (
    <ThemeProvider theme={{ darkMode: false }}>
      <Graph
        css={css`
          height: 100%;
          width: 100%;
        `}
        nodes={nodes}
        edges={[]}
        interactive={true}
      />
    </ThemeProvider>
  );
};

export const Shapes: StoryObj = {
  render: Template,
};
