/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import type { EntityItem as EntityItemType } from '@kbn/cloud-security-posture-common/types/graph_entities/v1';
import type {
  EventItem as EventItemType,
  AlertItem as AlertItemType,
} from '@kbn/cloud-security-posture-common/types/graph_events/v1';
import { GlobalStylesStorybookDecorator } from '../../../../../.storybook/decorators';
import { GroupedItem as GroupedItemComp } from './grouped_item';

// Base interface for common props across all stories
interface BaseStoryProps {
  isLoading?: boolean;
  id: string;
  timestamp?: string;
  ips?: string[];
  countryCodes?: string[];
}

// Entity-specific props (excluding type which is hardcoded)
interface EntityStoryProps extends BaseStoryProps {
  name?: string;
  risk?: number;
  icon?: string;
}

// Event/Alert-specific props (excluding type which is hardcoded)
interface EventAlertStoryProps extends BaseStoryProps {
  action?: string;
  actor?: { id: string; icon?: string; name?: string };
  target?: { id: string; icon?: string; name?: string };
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
    ...itemArgs,
  };

  return <GroupedItemComp isLoading={isLoading} item={item} />;
};

EntityItem.args = {
  isLoading: false,
  id: 'host-02',
  name: 'host-02.acme',
  risk: 55,
  ips: ['10.200.0.202'],
  countryCodes: ['US'],
  icon: 'storage',
  timestamp: new Date().toISOString(),
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
    isAlert: false,
    ...itemArgs,
  };

  return <GroupedItemComp isLoading={isLoading} item={item} />;
};

EventItem.args = {
  isLoading: false,
  id: 'event-id',
  action: 'process_start',
  timestamp: new Date().toISOString(),
  actor: { id: 'actorId', name: 'user1', icon: 'user' },
  target: { id: 'targetId', name: 'proc.exe', icon: 'document' },
};

EventItem.argTypes = {
  isLoading: { control: { type: 'boolean' } },
};

export const AlertItem: StoryFn<EventAlertStoryProps> = ({
  isLoading,
  ...itemArgs
}: EventAlertStoryProps) => {
  const item: AlertItemType = {
    isAlert: true,
    ...itemArgs,
  };

  return <GroupedItemComp isLoading={isLoading} item={item} />;
};

AlertItem.args = {
  isLoading: false,
  id: 'alert-id',
  action: 'suspicious_activity',
  timestamp: new Date().toISOString(),
  actor: { id: 'actorId', name: 'user1', icon: 'user' },
  target: { id: 'targetId', name: 'proc.exe', icon: 'document' },
};

AlertItem.argTypes = {
  isLoading: { control: { type: 'boolean' } },
};
