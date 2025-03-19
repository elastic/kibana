/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as utils from './utils';

describe('Search Notebooks Utils', () => {
  // Party Like It's
  const fakeNow = new Date('1999-12-31T23:59:59.999Z');
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fakeNow);
  });

  describe('dateWithinTTL', () => {
    it('return true if value is withing TTL of now', () => {
      expect(utils.dateWithinTTL(new Date('1999-12-31T23:59:58.999Z'), 10)).toBe(true);
      expect(utils.dateWithinTTL(new Date('1999-12-31T23:59:49.999Z'), 10)).toBe(true);
    });
    it('returns false is value is older than TTL', () => {
      expect(utils.dateWithinTTL(new Date('1999-12-31T23:59:48.999Z'), 10)).toBe(false);
      expect(utils.dateWithinTTL(new Date('1999-12-31T23:59:39.999Z'), 10)).toBe(false);
    });
  });
});
