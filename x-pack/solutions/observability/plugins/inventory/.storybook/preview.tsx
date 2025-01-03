/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as jest from 'jest-mock';
import { KibanaReactStorybookDecorator } from './storybook_decorator';

// @ts-ignore
window.jest = jest;

export const decorators = [KibanaReactStorybookDecorator];
