/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryFn, StoryObj } from '@storybook/react';
import { NBA_TODO_LIST } from './nba_translations';
import { Milestone } from '../../common/trial_companion/types';
import type { YourTrialCompanionProps } from './nba_get_setup_panel';
import { YourTrialCompanion } from './nba_get_setup_panel';

const meta: Meta<typeof YourTrialCompanion> = {
  component: YourTrialCompanion,
  title: 'Security Solution/Trial Companion/Your Trial Companion',
  args: {
    open: [Milestone.M1, Milestone.M2, Milestone.M3],
    todoItems: NBA_TODO_LIST,
  },
  argTypes: {
    open: {
      control: 'multi-select',
      options: [Milestone.M1, Milestone.M2, Milestone.M3, Milestone.M5, Milestone.M6],
      description: 'NBA open TODO items',
    },
  },
};

export default meta;

const Template: StoryFn<YourTrialCompanionProps> = (args) => {
  return <YourTrialCompanion {...args} />;
};

export const Milestone1Completed: StoryObj<YourTrialCompanionProps> = {
  render: Template,
  args: {
    open: [Milestone.M1, Milestone.M5, Milestone.M6],
    todoItems: NBA_TODO_LIST,
  },
};
