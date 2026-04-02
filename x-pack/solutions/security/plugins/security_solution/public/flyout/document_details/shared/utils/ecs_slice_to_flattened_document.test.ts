/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ecsSliceToFlattenedDocument } from './ecs_slice_to_flattened_document';

describe('ecsSliceToFlattenedDocument', () => {
  it('returns empty object for null, undefined, or non-object slice', () => {
    expect(ecsSliceToFlattenedDocument('host', null)).toEqual({});
    expect(ecsSliceToFlattenedDocument('host', undefined)).toEqual({});
    expect(ecsSliceToFlattenedDocument('host', 'x' as unknown as object)).toEqual({});
  });

  it('prefixes scalar and ECS-array fields, skips nested objects', () => {
    expect(
      ecsSliceToFlattenedDocument('host', {
        id: ['h1'],
        name: 'server',
        hostname: [],
        os: { name: ['Linux'] },
        domain: undefined,
      })
    ).toEqual({
      'host.id': 'h1',
      'host.name': 'server',
    });
  });

  it('works for other ECS prefixes (e.g. user)', () => {
    expect(
      ecsSliceToFlattenedDocument('user', {
        name: ['alice'],
        id: 'u-1',
      })
    ).toEqual({
      'user.name': 'alice',
      'user.id': 'u-1',
    });
  });
});
