/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeProviderDecorator } from '@kbn/kibana-react-plugin/common';
import { addDecorator } from '@storybook/react';
import { KibanaReactStorybookDecorator } from './storybook_decorator';
import * as jest from 'jest-mock';

export const decorators = [EuiThemeProviderDecorator];

window.jest = jest;

addDecorator(KibanaReactStorybookDecorator);
