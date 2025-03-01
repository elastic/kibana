/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { PreviewLensSuggestion as Component } from '.';
import { KibanaReactStorybookDecorator } from '../../../.storybook/storybook_decorator';

const meta: Meta<typeof Component> = {
  component: Component,
  title: 'app/Molecules/PreviewLensSuggestion',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;

const defaultProps: StoryObj<typeof Component> = {
  args: {},
  render: (props) => <Component {...props} />,
};

export const PreviewLensSuggestionStory: StoryObj<typeof Component> = {
  ...defaultProps,
  args: {},
  name: 'default',
};
