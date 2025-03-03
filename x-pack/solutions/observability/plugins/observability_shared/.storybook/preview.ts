/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeProviderDecorator } from '@kbn/kibana-react-plugin/common';
import type { Preview } from '@storybook/react';
import * as jest from 'jest-mock';
import { KibanaReactStorybookDecorator } from './storybook_decorator';

window.jest = jest;

const preview: Preview = {
  decorators: [EuiThemeProviderDecorator, KibanaReactStorybookDecorator],
};

// eslint-disable-next-line import/no-default-export
export default preview;
