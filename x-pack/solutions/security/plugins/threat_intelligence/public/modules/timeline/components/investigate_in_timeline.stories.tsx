/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { EuiContextMenuPanel } from '@elastic/eui';
import { StoryProvidersComponent } from '../../../mocks/story_providers';
import { generateMockUrlIndicator } from '../../../../common/types/indicator';
import {
  InvestigateInTimelineContextMenu,
  InvestigateInTimelineButtonIcon,
} from './investigate_in_timeline';

export default {
  title: 'InvestigateInTimeline',
};

const mockIndicator = generateMockUrlIndicator();

export const ContextMenu: Story<void> = () => {
  const items = [<InvestigateInTimelineContextMenu data={mockIndicator} />];

  return (
    <StoryProvidersComponent>
      <EuiContextMenuPanel items={items} />
    </StoryProvidersComponent>
  );
};

export const ButtonIcon: Story<void> = () => {
  return (
    <StoryProvidersComponent>
      <InvestigateInTimelineButtonIcon data={mockIndicator} />
    </StoryProvidersComponent>
  );
};
