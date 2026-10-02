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

const destination = { type: 'slack', connector_id: 'slack', params: { channel: '#alerts' } };

describe('notification destination input', () => {
  it.each([
    ['type', 100],
    ['connector_id', 500],
  ] as const)('requires a bounded nonempty %s', (field, limit) => {
    for (const value of [undefined, '', 'x'.repeat(limit + 1)]) {
      expect(
        investigationNotificationDestinationsSchema.safeParse([{ ...destination, [field]: value }])
          .success
      ).toBe(false);
    }
    expect(
      investigationNotificationDestinationsSchema.safeParse([
        { ...destination, [field]: 'x'.repeat(limit) },
      ]).success
    ).toBe(true);
  });
  it.each(['automation_id', 'automation_name'])('bounds optional %s', (field) => {
    for (const value of ['', 'x'.repeat(500)]) {
      expect(
        investigationNotificationDestinationsSchema.safeParse([{ ...destination, [field]: value }])
          .success
      ).toBe(true);
    }
    expect(
      investigationNotificationDestinationsSchema.safeParse([
        { ...destination, [field]: 'x'.repeat(501) },
      ]).success
    ).toBe(false);
  });
  it('keeps the envelope independent of connector-specific params and types', () => {
    expect(
      investigationNotificationDestinationsSchema.safeParse([
        {
          type: 'future-connector',
          connector_id: 'c',
          params: { target: { recipients: ['user'] }, enabled: true, count: 1, optional: null },
        },
      ]).success
    ).toBe(true);
    expect(
      investigationNotificationDestinationsSchema.safeParse([{ ...destination, params: {} }])
        .success
    ).toBe(true);
  });
  it.each([undefined, null, [], 'channel'])('requires params to be an object (%s)', (params) => {
    expect(
      investigationNotificationDestinationsSchema.safeParse([{ ...destination, params }]).success
    ).toBe(false);
  });
  it.each([
    'destination_index',
    'status',
    'attempt_id',
    'attempted_at',
    'message_ts',
    'error',
    'sent_at',
    'channel',
    'thread_ts',
  ])('rejects %s outside params', (field) => {
    expect(
      investigationNotificationDestinationsSchema.safeParse([{ ...destination, [field]: 'sent' }])
        .success
    ).toBe(false);
  });
  it('bounds the complete serialized params, including escaping', () => {
    const value = 'x'.repeat(4096 - JSON.stringify({ value: '' }).length);
    expect(
      investigationNotificationDestinationsSchema.safeParse([{ ...destination, params: { value } }])
        .success
    ).toBe(true);
    expect(
      investigationNotificationDestinationsSchema.safeParse([
        { ...destination, params: { value: value + 'x' } },
      ]).success
    ).toBe(false);
    expect(
      investigationNotificationDestinationsSchema.safeParse([
        { ...destination, params: { value: '\\'.repeat(2048) } },
      ]).success
    ).toBe(false);
  });
  it('bounds container depth, entries and key length', () => {
    const valid = (params: object) =>
      investigationNotificationDestinationsSchema.safeParse([{ ...destination, params }]).success;
    expect(valid({ a: { b: ['value'] } })).toBe(true);
    expect(valid({ a: { b: [{ c: 'value' }] } })).toBe(false);
    expect(
      valid(Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`k${index}`, true])))
    ).toBe(true);
    const tooManyKeys = Object.fromEntries(
      Array.from({ length: 21 }, (_, index) => [`k${index}`, true])
    );
    expect(valid(tooManyKeys)).toBe(false);
    expect(valid({ nested: tooManyKeys })).toBe(false);
    expect(valid({ values: Array(20).fill(true) })).toBe(true);
    expect(valid({ values: Array(21).fill(true) })).toBe(false);
    expect(valid({ ['x'.repeat(129)]: true })).toBe(false);
  });
  it('rejects cyclic and non-JSON params', () => {
    const cyclic: { nested?: object } = {};
    cyclic.nested = cyclic;
    for (const params of [
      cyclic,
      { value: undefined },
      { value: new Date() },
      { value: () => 'text' },
    ]) {
      expect(
        investigationNotificationDestinationsSchema.safeParse([{ ...destination, params }]).success
      ).toBe(false);
    }
  });
  it('accepts 20 destinations and rejects 21', () => {
    expect(
      investigationNotificationDestinationsSchema.safeParse(Array(20).fill(destination)).success
    ).toBe(true);
    expect(
      investigationNotificationDestinationsSchema.safeParse(Array(21).fill(destination)).success
    ).toBe(false);
  });
  it('stores bounded unconfirmed attempts separately from destinations', () => {
    const notification = {
      destination_index: 0,
      status: 'unconfirmed',
      attempt_id: 'id',
      attempted_at: new Date().toISOString(),
    };
    expect(investigationNotificationSchema.safeParse(notification).success).toBe(true);
    expect(
      investigationNotificationSchema.safeParse({ ...notification, ...destination }).success
    ).toBe(false);
    expect(
      investigationNotificationSchema.safeParse({ ...notification, attempt_id: 'x'.repeat(101) })
        .success
    ).toBe(false);
    expect(
      investigationNotificationSchema.safeParse({ ...notification, attempted_at: 'x'.repeat(65) })
        .success
    ).toBe(false);
    for (const destinationIndex of [-1, 20, 0.5])
      expect(
        investigationNotificationSchema.safeParse({
          ...notification,
          destination_index: destinationIndex,
        }).success
      ).toBe(false);
    for (const field of ['destination_index', 'status', 'attempt_id', 'attempted_at']) {
      const incomplete = { ...notification, [field]: undefined };
      expect(investigationNotificationSchema.safeParse(incomplete).success).toBe(false);
    }
  });
});
