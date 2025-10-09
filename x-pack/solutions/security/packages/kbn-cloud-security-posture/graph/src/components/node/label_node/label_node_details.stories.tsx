/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { ThemeProvider, css } from '@emotion/react';
import type { Meta, StoryObj } from '@storybook/react';
import type { LabelNodeViewModel } from '../..';
import { Graph } from '../..';
import { GlobalStylesStorybookDecorator } from '../../../../.storybook/decorators';

export default {
  title: 'Components/Graph Components/Label Node/Details',
  argTypes: {},
  decorators: [GlobalStylesStorybookDecorator],
} satisfies Meta<typeof Graph>;

const useCases = {
  'No details': { ips: [], countryCodes: [] },
  'With IPs': { ips: ['10.200.0.202', '74.25.14.20'], countryCodes: [] },
  'With country codes': { ips: [], countryCodes: ['us', 'fr', 'es'] },
  'With both': { ips: ['10.200.0.202', '74.25.14.20'], countryCodes: ['us', 'fr', 'es'] },
};

const Template = () => {
  const nodes: LabelNodeViewModel[] = useMemo(
    () =>
      Object.entries(useCases).map(([useCaseName, { ips, countryCodes }]) => ({
        id: useCaseName,
        label: useCaseName,
        color: 'primary',
        interactive: true,
        shape: 'label',
        ips,
        countryCodes,
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
