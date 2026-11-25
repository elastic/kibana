/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from './config';

describe('configSchema', () => {
  describe('sliRetention', () => {
    it('is undefined when not set', () => {
      expect(configSchema.validate({}).sliRetention).toBeUndefined();
    });

    it('defaults periodDays to 365', () => {
      expect(configSchema.validate({ sliRetention: { enabled: true } }).sliRetention).toEqual({
        enabled: true,
        periodDays: 365,
      });
    });

    it('accepts the bounds', () => {
      expect(
        configSchema.validate({ sliRetention: { enabled: false, periodDays: 180 } }).sliRetention
      ).toEqual({ enabled: false, periodDays: 180 });
      expect(
        configSchema.validate({ sliRetention: { enabled: false, periodDays: 3650 } }).sliRetention
      ).toEqual({ enabled: false, periodDays: 3650 });
    });

    it.each([179, 3651, 200.5])('rejects periodDays %s', (periodDays) => {
      expect(() => configSchema.validate({ sliRetention: { enabled: true, periodDays } })).toThrow(
        /\[sliRetention\.periodDays\]/
      );
    });

    it('requires enabled', () => {
      expect(() => configSchema.validate({ sliRetention: { periodDays: 200 } })).toThrow(
        /\[sliRetention\.enabled\]/
      );
    });
  });
});
