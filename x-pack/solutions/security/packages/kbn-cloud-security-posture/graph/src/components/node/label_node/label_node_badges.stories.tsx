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
  title: 'Components/Graph Components/Label Node/Badges',
  argTypes: {},
  decorators: [GlobalStylesStorybookDecorator],
} satisfies Meta<typeof Graph>;

const useCases = {
  'Single event': { eventsCount: 1, alertsCount: 0 },
  'Single alert': { eventsCount: 0, alertsCount: 1 },
  'Multiple events': { eventsCount: 2, alertsCount: 0 },
  'Multiple alerts': { eventsCount: 0, alertsCount: 2 },
  'Hundreds of events': { eventsCount: 120, alertsCount: 0 },
  'Hundreds of alerts': { eventsCount: 0, alertsCount: 120 },
  'Multiple events and alerts': { eventsCount: 2, alertsCount: 2 },
  'Hundreds of events and alerts': { eventsCount: 120, alertsCount: 120 },
  'Millions of events and alerts': { eventsCount: 1_200_000, alertsCount: 1_200_000 },
};

const Template = () => {
  const nodes: LabelNodeViewModel[] = useMemo(
    () =>
      Object.entries(useCases).map(([useCaseName, { eventsCount, alertsCount }]) => ({
        id: useCaseName,
        label: useCaseName,
        color: alertsCount >= 1 && eventsCount === 0 ? 'danger' : 'primary',
        interactive: true,
        shape: 'label',
        eventsCount,
        alertsCount,
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

export const Badges: StoryObj = {
  render: Template,
};
