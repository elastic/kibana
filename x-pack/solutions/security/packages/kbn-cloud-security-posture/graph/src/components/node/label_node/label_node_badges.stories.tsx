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

const hundredsOfEvents = Array.from({ length: 120 }, (_, i) => ({
  id: `event${i + 1}`,
  type: 'event' as const,
}));
const hundredsOfAlerts = Array.from({ length: 120 }, (_, i) => ({
  id: `alert${i + 1}`,
  type: 'alert' as const,
}));

const nodeDocumentsData = {
  'Single event': [{ id: 'event1', type: 'event' as const }],
  'Single alert': [{ id: 'alert1', type: 'alert' as const }],
  'Multiple events': [
    { id: 'event1', type: 'event' as const },
    { id: 'event2', type: 'event' as const },
  ],
  'Multiple alerts': [
    { id: 'alert1', type: 'alert' as const },
    { id: 'alert2', type: 'alert' as const },
  ],
  'Hundreds of events': hundredsOfEvents,
  'Hundreds of alerts': hundredsOfAlerts,
  'One event and one alert': [
    { id: 'event1', type: 'event' as const },
    { id: 'alert1', type: 'alert' as const },
  ],
  'Multiple events and alerts': [
    { id: 'event1', type: 'event' as const },
    { id: 'event2', type: 'event' as const },
    { id: 'alert1', type: 'alert' as const },
    { id: 'alert2', type: 'alert' as const },
  ],
  'Hundreds of events and alerts': [...hundredsOfEvents, ...hundredsOfAlerts],
};

const Template = () => {
  const nodes: LabelNodeViewModel[] = useMemo(
    () =>
      Object.entries(nodeDocumentsData).map(([useCaseName, documentsData]) => ({
        id: useCaseName,
        label: useCaseName,
        color: 'primary',
        interactive: true,
        shape: 'label',
        documentsData,
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
