/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { validateHistorySnapshotTimezone } from './history_snapshot_timezone_validator';

const makeSchema = (isOptional: boolean) =>
  z
    .object({ timezone: z.string().optional() })
    .superRefine(validateHistorySnapshotTimezone({ isOptional }));

describe('validateHistorySnapshotTimezone', () => {
  describe('when isOptional: true', () => {
    const schema = makeSchema(true);

    it('accepts missing timezone', () => {
      expect(schema.safeParse({}).success).toBe(true);
    });

    it.each(['UTC', 'America/New_York', 'Europe/London'])(
      'accepts valid timezone %s',
      (timezone) => {
        expect(schema.safeParse({ timezone }).success).toBe(true);
      }
    );

    it('rejects invalid timezone', () => {
      const result = schema.safeParse({ timezone: 'Not/ATimezone' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('timezone'));
        expect(issue?.message).toMatch(/valid timezone/);
      }
    });
  });

  describe('when isOptional: false', () => {
    const schema = makeSchema(false);

    it('rejects missing timezone', () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('timezone'));
        expect(issue?.message).toMatch(/timezone is required/);
      }
    });

    it.each(['UTC', 'America/New_York', 'Europe/London'])(
      'accepts valid timezone %s',
      (timezone) => {
        expect(schema.safeParse({ timezone }).success).toBe(true);
      }
    );

    it('rejects invalid timezone', () => {
      const result = schema.safeParse({ timezone: 'Not/ATimezone' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('timezone'));
        expect(issue?.message).toMatch(/valid timezone/);
      }
    });
  });
});
