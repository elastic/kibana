/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryFn, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@emotion/react';
import { Tag as TagComponent, type TagProps } from './tag';
import { GlobalStylesStorybookDecorator } from '../../../../.storybook/decorators';

import '@xyflow/react/dist/style.css';

const meta: Meta<TagProps> = {
  title: 'Components/Graph Components/Additional Components',
  args: {
    count: 5,
    text: 'Host',
  },
  decorators: [GlobalStylesStorybookDecorator],
};

export default meta;

const Template: StoryFn<TagProps> = (props: TagProps) => (
  <ThemeProvider theme={{ darkMode: false }}>
    <TagComponent {...props} />
  </ThemeProvider>
);

export const Tag: StoryObj<TagProps> = {
  render: Template,
};
