/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from 'styled-components';
import { euiLightVars } from '@kbn/ui-theme';

import { TextFieldValue } from '.';

const longText = [...new Array(20).keys()].map((i) => ` super long text part ${i}`).join(' ');

const meta: Meta<typeof TextFieldValue> = {
  title: 'Components/TextFieldValue',
  component: TextFieldValue,
  decorators: [
    (Story) => (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TextFieldValue>;

export const ShortTextNoLimit: Story = {
  name: 'short text, no limit',
  args: {
    fieldName: 'Field name',
    value: 'Small value',
  },
};

export const ShortTextWithLimit: Story = {
  name: 'short text, with limit',
  args: {
    fieldName: 'Field name',
    value: 'Small value',
    maxLength: 100,
  },
};

export const LongTextNoLimit: Story = {
  name: 'long text, no limit',
  args: {
    fieldName: 'Field name',
    value: longText,
  },
};

export const LongTextWithLimit: Story = {
  name: 'long text, with limit',
  args: {
    fieldName: 'Field name',
    value: longText,
    maxLength: 100,
  },
};
