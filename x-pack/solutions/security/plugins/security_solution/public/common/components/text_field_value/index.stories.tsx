/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { storiesOf, addDecorator } from '@storybook/react';
import { euiLightVars } from '@kbn/ui-theme';

import { TextFieldValue } from '.';

addDecorator((storyFn) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
));

const longText = [...new Array(20).keys()].map((i) => ` super long text part ${i}`).join(' ');

storiesOf('Components/TextFieldValue', module)
  .add('short text, no limit', () => <TextFieldValue fieldName="Field name" value="Small value" />)
  .add('short text, with limit', () => (
    <TextFieldValue fieldName="Field name" value="Small value" maxLength={100} />
  ))
  .add('long text, no limit', () => <TextFieldValue fieldName="Field name" value={longText} />)
  .add('long text, with limit', () => (
    <TextFieldValue fieldName="Field name" value={longText} maxLength={100} />
  ));
