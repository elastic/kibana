/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { listParamsSchema, typeNameSchema, typePathParamsSchema } from './schemas';

describe('typeNameSchema', () => {
  it.each(['host', 'k8s.pod', 'aws_s3-bucket', 'k8s.deployment', 'a'.repeat(64)])(
    'accepts %s',
    (type) => {
      expect(typeNameSchema.safeParse(type).success).toBe(true);
    }
  );

  it.each([
    ['empty', ''],
    ['over 64 characters', 'a'.repeat(65)],
    ['uppercase', 'K8s.pod'],
    ['a leading digit', '8s.pod'],
    ['a leading separator', '.pod'],
    ['a trailing separator', 'k8s.'],
    ['repeated separators', 'k8s..pod'],
    ['a space', 'k8s pod'],
  ])('rejects %s', (_label, type) => {
    expect(typeNameSchema.safeParse(type).success).toBe(false);
  });
});

describe('typePathParamsSchema', () => {
  it('accepts a valid type in the path', () => {
    expect(typePathParamsSchema.parse({ path: { type: 'k8s.pod' } })).toEqual({
      path: { type: 'k8s.pod' },
    });
  });

  it('rejects a malformed type in the path', () => {
    expect(typePathParamsSchema.safeParse({ path: { type: 'K8S' } }).success).toBe(false);
  });
});

describe('listParamsSchema', () => {
  const FROM = '2026-11-01T10:00:00.000Z';
  const TO = '2026-11-01T11:00:00.000Z';
  const parse = (body: Record<string, unknown>) =>
    listParamsSchema.safeParse({ path: { type: 'k8s.deployment' }, body });

  it('defaults limit to 9,999', () => {
    expect(parse({ from: FROM, to: TO })).toMatchObject({
      success: true,
      data: { path: { type: 'k8s.deployment' }, body: { from: FROM, to: TO, limit: 9999 } },
    });
  });

  it.each([1, 9999])('accepts limit %i', (limit) => {
    expect(parse({ from: FROM, to: TO, limit })).toMatchObject({
      success: true,
      data: { body: { limit } },
    });
  });

  it.each([
    ['0', 0],
    ['10,000', 10_000],
    ['a fraction', 1.5],
    ['a string', '10'],
  ])('rejects limit %s', (_label, limit) => {
    expect(parse({ from: FROM, to: TO, limit }).success).toBe(false);
  });

  it('accepts an offset other than Z', () => {
    expect(parse({ from: '2026-11-01T12:00:00+02:00', to: TO }).success).toBe(true);
  });

  it.each([
    ['an invalid from', { from: 'yesterday', to: TO }],
    ['an invalid to', { from: FROM, to: '2026-13-01T00:00:00Z' }],
    ['a date without a time', { from: '2026-11-01', to: TO }],
    ['a missing from', { to: TO }],
    ['a missing to', { from: FROM }],
    ['a non-string from', { from: 1, to: TO }],
    ['a from over the length bound', { from: `${FROM}${'0'.repeat(64)}`, to: TO }],
  ])('rejects %s', (_label, body) => {
    expect(parse(body).success).toBe(false);
  });

  it.each([
    ['from equal to to', { from: FROM, to: FROM }],
    ['from after to', { from: TO, to: FROM }],
  ])('rejects %s with a message naming both bounds', (_label, body) => {
    const result = parse(body);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map(({ message }) => message)).toEqual([
      'from must be earlier than to',
    ]);
  });

  it('rejects a malformed type in the path', () => {
    expect(
      listParamsSchema.safeParse({ path: { type: 'K8S' }, body: { from: FROM, to: TO } }).success
    ).toBe(false);
  });
});
