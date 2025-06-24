/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringToObjectFormatter } from './formatting_utils';
import { ConfigKey } from '../../../../common/runtime_types';
import { secondsToCronFormatter } from '../formatting_utils';

describe('common formatters', () => {
  it.each([
    ['', undefined],
    ['{', undefined],
    ['{}', undefined],
    ['{"some": "json"}', { some: 'json' }],
  ])('formats strings to objects correctly, avoiding errors', (input, expected) => {
    expect(stringToObjectFormatter({ name: input }, ConfigKey.NAME)).toEqual(expected);
  });
});

describe('formatters', () => {
  describe('cronToSecondsNormalizer', () => {
    it('takes a number of seconds and converts it to cron format', () => {
      expect(secondsToCronFormatter({ [ConfigKey.WAIT]: '3' }, ConfigKey.WAIT)).toEqual('3s');
    });
  });
});
