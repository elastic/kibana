/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripIdAndCreatedAtFromItem } from './utils';

describe('stripIdAndCreatedAtFromItem', () => {
  it('removes the id and created_at fields from an object', () => {
    expect(stripIdAndCreatedAtFromItem({ id: 123, created_at: 'today' })).toEqual({});

    expect(
      stripIdAndCreatedAtFromItem({ id: 123, created_at: 'today', hello: 'world' } as any)
    ).toEqual({ hello: 'world' });
  });

  it('does not mutate the original object', () => {
    const item = { id: 456, created_at: 'yesterday' };
    expect(stripIdAndCreatedAtFromItem(item)).not.toBe(item);
  });
});
