/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { GlobalStylesStorybookDecorator } from '../../../../../.storybook/decorators';
import { GroupedItem as GroupedItemComp } from './grouped_item';
import type {
  EntityItem as EntityItemType,
  EventItem as EventItemType,
  AlertItem as AlertItemType,
} from './types';

// Base interface for common props across all stories
interface BaseStoryProps {
  isLoading?: boolean;
  id?: string;
  timestamp?: string | number | Date;
  ip?: string;
  countryCode?: string;
}

// Entity-specific props (excluding type which is hardcoded)
interface EntityStoryProps extends BaseStoryProps {
  label?: string;
  risk?: number;
  icon?: string;
}

// Event/Alert-specific props (excluding type which is hardcoded)
interface EventAlertStoryProps extends BaseStoryProps {
  action?: string;
  actor?: { id: string; icon?: string; label?: string };
  target?: { id: string; icon?: string; label?: string };
}

const meta: Meta = {
  title: 'Components/Flyout components/GroupedItem',
  decorators: [GlobalStylesStorybookDecorator],
};

export default meta;

export const EntityItem: StoryFn<EntityStoryProps> = ({
  isLoading,
  ...itemArgs
}: EntityStoryProps) => {
  const item: EntityItemType = {
    type: 'entity',
    ...itemArgs,
  };

  return <GroupedItemComp isLoading={isLoading} item={item} />;
};

EntityItem.args = {
  isLoading: false,
  id: 'host-02',
  label: 'host-02.acme',
  risk: 55,
  ip: '10.200.0.202',
  countryCode: 'US',
  icon: 'storage',
  timestamp: Date.now(),
};

EntityItem.argTypes = {
  isLoading: { control: { type: 'boolean' } },
  risk: { control: { type: 'number', min: 0, max: 100 } },
};

export const EventItem: StoryFn<EventAlertStoryProps> = ({
  isLoading,
  ...itemArgs
}: EventAlertStoryProps) => {
  const item: EventItemType = {
    type: 'event',
    ...itemArgs,
  };

  return <GroupedItemComp isLoading={isLoading} item={item} />;
};

EventItem.args = {
  isLoading: false,
  id: 'event-id',
  action: 'process_start',
  timestamp: Date.now(),
  actor: { id: 'actorId', label: 'user1', icon: 'user' },
  target: { id: 'targetId', label: 'proc.exe', icon: 'document' },
};

EventItem.argTypes = {
  isLoading: { control: { type: 'boolean' } },
};

export const AlertItem: StoryFn<EventAlertStoryProps> = ({
  isLoading,
  ...itemArgs
}: EventAlertStoryProps) => {
  const item: AlertItemType = {
    type: 'alert',
    ...itemArgs,
  };

  return <GroupedItemComp isLoading={isLoading} item={item} />;
};

AlertItem.args = {
  isLoading: false,
  id: 'alert-id',
  action: 'suspicious_activity',
  timestamp: Date.now(),
  actor: { id: 'actorId', label: 'user1', icon: 'user' },
  target: { id: 'targetId', label: 'proc.exe', icon: 'document' },
};

AlertItem.argTypes = {
  isLoading: { control: { type: 'boolean' } },
};
