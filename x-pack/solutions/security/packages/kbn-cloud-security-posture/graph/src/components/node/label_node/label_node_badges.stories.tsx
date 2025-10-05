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
import { useEventDetailsPopover } from '../../graph_investigation/use_event_details_popover';
import { analyzeDocuments } from './analyze_documents';
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
  'With clickable events popover - only events': { uniqueEventsCount: 5, uniqueAlertsCount: 0 },
  'With clickable events popover - only alerts': { uniqueEventsCount: 0, uniqueAlertsCount: 3 },
  'With clickable events popover': { uniqueEventsCount: 5, uniqueAlertsCount: 3 },
};

const Template = () => {
  // Create analysis for the popover use case
  const popoverAnalysis = analyzeDocuments({ uniqueEventsCount: 5, uniqueAlertsCount: 3 });
  const eventDetailsPopover = useEventDetailsPopover(
    popoverAnalysis,
    'With clickable events popover'
  );

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
        // Add event click handler only for the last use case
        eventClickHandler:
          useCaseName === 'With clickable events popover' ||
          useCaseName === 'With clickable events popover - only events' ||
          useCaseName === 'With clickable events popover - only alerts'
            ? eventDetailsPopover.onEventClick
            : undefined,
      })),
    [eventDetailsPopover.onEventClick]
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
      <eventDetailsPopover.PopoverComponent />
    </ThemeProvider>
  );
};

export const Badges: StoryObj = {
  render: Template,
};
