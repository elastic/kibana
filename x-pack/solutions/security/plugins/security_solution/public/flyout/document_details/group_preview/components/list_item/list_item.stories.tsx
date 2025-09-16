/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { StoryFn } from '@storybook/react';
import { GroupedListItem } from './list_item';

export default {
  component: GroupedListItem,
  title: 'Flyout/GroupedListItem',
};

export const Event: StoryFn = () => (
  <GroupedListItem
    item={{
      type: 'event',
      id: 'event-id',
      action: 'process_start',
      timestamp: Date.now(),
      actor: { id: 'actorId', label: 'user1' },
      target: { id: 'targetId', label: 'proc.exe' },
      ip: '1.2.3.4',
      countryCode: 'US',
    }}
  />
);

export const Alert: StoryFn = () => (
  <GroupedListItem
    item={{
      type: 'alert',
      id: 'alert-id',
      action: 'suspicious_activity',
      timestamp: Date.now(),
      actor: { label: 'host', id: 'host-1' },
      ip: '9.9.9.9',
      countryCode: 'US',
    }}
  />
);

export const Entity: StoryFn = () => (
  <GroupedListItem
    item={{
      type: 'entity',
      label: 'host-02.acme',
      id: 'host-02',
      risk: 55,
      ip: '10.200.0.202',
      countryCode: 'US',
      icon: 'node',
      timestamp: Date.now(),
    }}
  />
);

export const Loading: StoryFn = () => (
  <GroupedListItem
    isLoading
    item={{ type: 'event', id: 'event-id', action: 'placeholder', timestamp: Date.now() }}
  />
);
