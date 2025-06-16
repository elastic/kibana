/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';

moment.tz.setDefault('UTC');

import { getFormattedCheckTime } from './get_formatted_check_time';

describe('getFormattedCheckTime', () => {
  it('returns formatted check time', () => {
    const formattedCheckTime = getFormattedCheckTime(1613474400000);
    expect(formattedCheckTime).toBe('Feb 16, 2021 @ 11:20:00');
  });

  describe('when check time is invalid', () => {
    it('returns -- string', () => {
      const formattedCheckTime = getFormattedCheckTime(Infinity);
      expect(formattedCheckTime).toBe('--');
    });
  });
});
