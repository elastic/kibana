/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  investigationNotificationDestinationsSchema,
  investigationNotificationSchema,
} from './schemas';

const destination = { type: 'slack', connector_id: 'slack', channel: '#alerts' };

describe('notification destination input', () => {
  it.each(['connector_id', 'channel'])('requires a bounded nonempty %s', (field) => {
    for (const value of [undefined, '', 'x'.repeat(501)]) {
      expect(
        investigationNotificationDestinationsSchema.safeParse([{ ...destination, [field]: value }])
          .success
      ).toBe(false);
    }
    expect(
      investigationNotificationDestinationsSchema.safeParse([
        { ...destination, [field]: 'x'.repeat(500) },
      ]).success
    ).toBe(true);
  });
  it.each([
    ['thread_ts', 100],
    ['automation_id', 500],
    ['automation_name', 500],
  ] as const)('bounds optional %s', (field, limit) => {
    expect(
      investigationNotificationDestinationsSchema.safeParse([{ ...destination, [field]: '' }])
        .success
    ).toBe(true);
    expect(
      investigationNotificationDestinationsSchema.safeParse([
        { ...destination, [field]: 'x'.repeat(limit) },
      ]).success
    ).toBe(true);
    expect(
      investigationNotificationDestinationsSchema.safeParse([
        { ...destination, [field]: 'x'.repeat(limit + 1) },
      ]).success
    ).toBe(false);
  });
  it.each(['status', 'attempt_id', 'attempted_at', 'message_ts', 'error', 'sent_at'])(
    'rejects server-owned %s input',
    (field) => {
      expect(
        investigationNotificationDestinationsSchema.safeParse([{ ...destination, [field]: 'sent' }])
          .success
      ).toBe(false);
    }
  );
  it('accepts 20 destinations and rejects 21', () => {
    expect(
      investigationNotificationDestinationsSchema.safeParse(Array(20).fill(destination)).success
    ).toBe(true);
    expect(
      investigationNotificationDestinationsSchema.safeParse(Array(21).fill(destination)).success
    ).toBe(false);
  });
  it('stores bounded unconfirmed attempt metadata', () => {
    expect(
      investigationNotificationSchema.safeParse({
        ...destination,
        status: 'unconfirmed',
        attempt_id: 'id',
        attempted_at: new Date().toISOString(),
      }).success
    ).toBe(true);
    expect(
      investigationNotificationSchema.safeParse({ ...destination, attempt_id: 'x'.repeat(101) })
        .success
    ).toBe(false);
    expect(
      investigationNotificationSchema.safeParse({ ...destination, attempted_at: 'x'.repeat(65) })
        .success
    ).toBe(false);
  });
});
