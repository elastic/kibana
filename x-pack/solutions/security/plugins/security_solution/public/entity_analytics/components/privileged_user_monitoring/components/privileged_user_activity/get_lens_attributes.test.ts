/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { getLensAttributes } from './get_lens_attributes';

jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => 'uuidv4()'),
  };
});

describe('getLensAttributes', () => {
  it('should generate lens attributes with default values', () => {
    const result = getLensAttributes({
      esql: 'FROM my_index',
      stackByField: 'user.name',
      extraOptions: {},
      euiTheme: {} as EuiThemeComputed,
    });
    expect(result).toMatchSnapshot();
  });
});
