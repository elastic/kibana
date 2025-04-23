/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta } from '@storybook/react';
import { ThemeProvider } from 'styled-components';
import { euiLightVars } from '@kbn/ui-theme';

import { TextFieldValue } from '.';

const longText = [...new Array(20).keys()].map((i) => ` super long text part ${i}`).join(' ');

export default {
  title: 'Components/TextFieldValue',
  decorators: [
    (storyFn) => (
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        {storyFn()}
      </ThemeProvider>
    ),
  ],
} as Meta;

export const ShortTextNoLimit = {
  render: () => <TextFieldValue fieldName="Field name" value="Small value" />,
  name: 'short text, no limit',
};

export const ShortTextWithLimit = {
  render: () => <TextFieldValue fieldName="Field name" value="Small value" maxLength={100} />,

  name: 'short text, with limit',
};

export const LongTextNoLimit = {
  render: () => <TextFieldValue fieldName="Field name" value={longText} />,
  name: 'long text, no limit',
};

export const LongTextWithLimit = {
  render: () => <TextFieldValue fieldName="Field name" value={longText} maxLength={100} />,

  name: 'long text, with limit',
};
