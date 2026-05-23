/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { USER_IDENTITY_SOURCE_FIELDS, extractUserIdentity } from '../identity_fields';

describe('USER_IDENTITY_SOURCE_FIELDS', () => {
  it('lists the three identity field paths in the order used by ES `_source`', () => {
    // Locks in the exact field paths so the ES `_source` projection matches
    // what `extractUserIdentity` looks up below. Drift here would silently
    // drop identity fields from the embed pipeline.
    expect([...USER_IDENTITY_SOURCE_FIELDS]).toEqual(['user.name', 'user.full_name', 'user.email']);
  });
});

describe('extractUserIdentity', () => {
  it('reads flat-keyed dotted entries from the LATEST index shape', () => {
    expect(
      extractUserIdentity({
        'user.name': 'alice',
        'user.full_name': 'Alice Patterson',
        'user.email': 'alice@corp.com',
      })
    ).toEqual({
      name: 'alice',
      full_name: 'Alice Patterson',
      email: 'alice@corp.com',
    });
  });

  it('reads nested user objects (older docs / bulk update round-trips)', () => {
    expect(
      extractUserIdentity({
        user: {
          name: 'bob',
          full_name: 'Bob Jones',
          email: 'bob@corp.com',
        },
      })
    ).toEqual({
      name: 'bob',
      full_name: 'Bob Jones',
      email: 'bob@corp.com',
    });
  });

  it('returns undefined for missing fields rather than empty strings', () => {
    expect(extractUserIdentity({ 'user.email': 'carol@corp.com' })).toEqual({
      name: undefined,
      full_name: undefined,
      email: 'carol@corp.com',
    });
  });

  it('returns undefined when the source has none of the identity fields', () => {
    expect(extractUserIdentity({})).toEqual({
      name: undefined,
      full_name: undefined,
      email: undefined,
    });
  });

  it('returns undefined for null and empty-string field values (defensive against bad mappings)', () => {
    // `getFieldValue` treats null and '' as empty (returns undefined). Numeric
    // values get String()-coerced but the embed pipeline never receives them
    // in practice, so we only pin the empty cases here.
    expect(
      extractUserIdentity({
        'user.name': null,
        'user.full_name': '',
        'user.email': undefined,
      } as unknown as Record<string, unknown>)
    ).toEqual({
      name: undefined,
      full_name: undefined,
      email: undefined,
    });
  });
});
