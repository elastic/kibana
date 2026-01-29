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
import { useEventDetailsPopover } from '../../popovers/details/use_event_details_popover';
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
};

const Template = () => {
  // Create individual popovers for each use case at the top level (following Rules of Hooks)
  const singleEventPopover = useEventDetailsPopover(
    analyzeDocuments({ uniqueEventsCount: 1, uniqueAlertsCount: 0 }),
    'Single event'
  );
  const singleAlertPopover = useEventDetailsPopover(
    analyzeDocuments({ uniqueEventsCount: 0, uniqueAlertsCount: 1 }),
    'Single alert'
  );
  const multipleEventsPopover = useEventDetailsPopover(
    analyzeDocuments({ uniqueEventsCount: 2, uniqueAlertsCount: 0 }),
    'Multiple events'
  );
  const multipleAlertsPopover = useEventDetailsPopover(
    analyzeDocuments({ uniqueEventsCount: 0, uniqueAlertsCount: 2 }),
    'Multiple alerts'
  );
  const hundredsOfEventsPopover = useEventDetailsPopover(
    analyzeDocuments({ uniqueEventsCount: 120, uniqueAlertsCount: 0 }),
    'Hundreds of events'
  );
  const hundredsOfAlertsPopover = useEventDetailsPopover(
    analyzeDocuments({ uniqueEventsCount: 0, uniqueAlertsCount: 120 }),
    'Hundreds of alerts'
  );
  const multipleEventsAndAlertsPopover = useEventDetailsPopover(
    analyzeDocuments({ uniqueEventsCount: 2, uniqueAlertsCount: 2 }),
    'Multiple events and alerts'
  );
  const hundredsOfEventsAndAlertsPopover = useEventDetailsPopover(
    analyzeDocuments({ uniqueEventsCount: 120, uniqueAlertsCount: 120 }),
    'Hundreds of events and alerts'
  );
  const millionsOfEventsAndAlertsPopover = useEventDetailsPopover(
    analyzeDocuments({ uniqueEventsCount: 1_200_000, uniqueAlertsCount: 1_200_000 }),
    'Millions of events and alerts'
  );

  // Create popovers mapping
  const popovers = useMemo(
    () => ({
      'Single event': singleEventPopover,
      'Single alert': singleAlertPopover,
      'Multiple events': multipleEventsPopover,
      'Multiple alerts': multipleAlertsPopover,
      'Hundreds of events': hundredsOfEventsPopover,
      'Hundreds of alerts': hundredsOfAlertsPopover,
      'Multiple events and alerts': multipleEventsAndAlertsPopover,
      'Hundreds of events and alerts': hundredsOfEventsAndAlertsPopover,
      'Millions of events and alerts': millionsOfEventsAndAlertsPopover,
    }),
    [
      singleEventPopover,
      singleAlertPopover,
      multipleEventsPopover,
      multipleAlertsPopover,
      hundredsOfEventsPopover,
      hundredsOfAlertsPopover,
      multipleEventsAndAlertsPopover,
      hundredsOfEventsAndAlertsPopover,
      millionsOfEventsAndAlertsPopover,
    ]
  );

  const nodes: LabelNodeViewModel[] = useMemo(
    () =>
      Object.entries(useCases).map(([useCaseName, { uniqueEventsCount, uniqueAlertsCount }]) => {
        const eventClickHandler = popovers[useCaseName as keyof typeof popovers]?.onEventClick;

        return {
          id: useCaseName,
          label: useCaseName,
          color: uniqueAlertsCount >= 1 && uniqueEventsCount === 0 ? 'danger' : 'primary',
          interactive: true,
          shape: 'label',
          uniqueEventsCount,
          uniqueAlertsCount,
          eventClickHandler,
        };
      }),
    [popovers]
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
      {Object.values(popovers).map((popover, index) => (
        <popover.PopoverComponent key={index} />
      ))}
    </ThemeProvider>
  );
};

export const Badges: StoryObj = {
  render: Template,
};
