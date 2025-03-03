/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Preview } from '@storybook/react';
import * as jest from 'jest-mock';
import { KibanaReactStorybookDecorator } from './storybook_decorator';

// @ts-ignore
window.jest = jest;

const preview: Preview = {
  decorators: [KibanaReactStorybookDecorator],
};

// eslint-disable-next-line import/no-default-export
export default preview;
