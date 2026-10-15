/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toSnapshotDay } from './to_snapshot_day';

describe('toSnapshotDay', () => {
  it('returns the UTC day of the date', () => {
    expect(toSnapshotDay(new Date('2026-09-28T12:34:56.000Z'))).toBe('2026-09-28');
  });

  it('uses UTC, not the local day, near midnight', () => {
    expect(toSnapshotDay(new Date('2026-09-28T23:59:59.999-05:00'))).toBe('2026-09-29');
  });
});
