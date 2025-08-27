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

const useCases = {
  'No details': {},
  'Only Tag': { tag: 'Host' },
  'Tag and IPs': { tag: 'Host', ips: ['10.200.0.202', '74.25.14.20'] },
  'Tag and Country Codes': { tag: 'Host', countryCodes: ['us', 'fr', 'es'] },
  'Tag and Count > 1': { tag: 'Host', count: 2 },
  Everything: {
    tag: 'Host',
    count: 2,
    ips: ['10.200.0.202', '74.25.14.20'],
    countryCodes: ['us', 'fr', 'es'],
  },
};

const Template = () => {
  const nodes: Array<EntityNodeViewModel | LabelNodeViewModel> = useMemo(
    () =>
      Object.entries(useCases).map(([useCaseName, props]) => ({
        id: useCaseName,
        shape: 'hexagon',
        color: 'primary',
        icon: 'storage',
        interactive: true,
        ...props,
      })),
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

export const Details: StoryObj = {
  render: Template,
};
