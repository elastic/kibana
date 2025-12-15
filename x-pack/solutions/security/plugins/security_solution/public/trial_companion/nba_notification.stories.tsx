/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryFn, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import type { NBANotificationProps } from './nba_notification';
import { NBANotification } from './nba_notification';
import { Milestone } from '../../common/trial_companion/types';
import { ALL_NBA } from './nba_translations';

const meta: Meta<typeof NBANotification> = {
  component: NBANotification,
  title: 'Security Solution/Trial Companion/NBANotification',
  argTypes: {
    title: {
      control: 'text',
      description: 'The title of the NBA callout',
    },
    message: {
      control: 'text',
      description: 'The message of the NBA',
    },
    viewButtonText: {
      control: 'text',
      description: 'next action button text',
    },
  },
};

export default meta;

const Template: StoryFn<NBANotificationProps> = (args) => {
  return <NBANotification {...args} />;
};

const nbaM1 = ALL_NBA.get(Milestone.M1);

export const Milestone1InstallIntegrations: StoryObj<NBANotificationProps> = {
  render: Template,
  args: {
    title: nbaM1?.title,
    message: nbaM1?.message,
    viewButtonText: nbaM1?.apps?.[0].text,
    onSeenBanner: action('onSeenBanner'),
    onViewButton: action('onViewButton'),
  },
};
