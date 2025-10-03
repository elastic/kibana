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
  'Single event': { uniqueEventsCount: 1, uniqueAlertsCount: 0 },
  'Single alert': { uniqueEventsCount: 0, uniqueAlertsCount: 1 },
  'Multiple events': { uniqueEventsCount: 2, uniqueAlertsCount: 0 },
  'Multiple alerts': { uniqueEventsCount: 0, uniqueAlertsCount: 2 },
  'Hundreds of events': { uniqueEventsCount: 120, uniqueAlertsCount: 0 },
  'Hundreds of alerts': { uniqueEventsCount: 0, uniqueAlertsCount: 120 },
  'Multiple events and alerts': { uniqueEventsCount: 2, uniqueAlertsCount: 2 },
  'Hundreds of events and alerts': { uniqueEventsCount: 120, uniqueAlertsCount: 120 },
  'Millions of events and alerts': { uniqueEventsCount: 1_200_000, uniqueAlertsCount: 1_200_000 },
};

const Template = () => {
  const nodes: LabelNodeViewModel[] = useMemo(
    () =>
      Object.entries(useCases).map(([useCaseName, { uniqueEventsCount, uniqueAlertsCount }]) => ({
        id: useCaseName,
        label: useCaseName,
        color: uniqueAlertsCount >= 1 && uniqueEventsCount === 0 ? 'danger' : 'primary',
        interactive: true,
        shape: 'label',
        uniqueEventsCount,
        uniqueAlertsCount,
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
