/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normaliseEntityAttachment } from './payload';
import type { EntityAttachment } from './types';

const buildAttachment = (data: unknown): EntityAttachment =>
  ({
    id: 'a',
    type: 'security.entity',
    data: data as EntityAttachment['data'],
  } as EntityAttachment);

describe('normaliseEntityAttachment', () => {
  it('accepts legacy single-identifier payload and returns isSingle=true', () => {
    const result = normaliseEntityAttachment(
      buildAttachment({ identifierType: 'host', identifier: 'alpha' })
    );
    expect(result).toEqual({
      isSingle: true,
      attachmentLabel: undefined,
      entities: [{ identifierType: 'host', identifier: 'alpha' }],
    });
  });

  it('passes attachmentLabel through', () => {
    const result = normaliseEntityAttachment(
      buildAttachment({
        identifierType: 'user',
        identifier: 'bob',
        attachmentLabel: 'Bob user',
      })
    );
    expect(result?.attachmentLabel).toBe('Bob user');
  });

  it('accepts multi-entity payload with entities array', () => {
    const result = normaliseEntityAttachment(
      buildAttachment({
        entities: [
          { identifierType: 'host', identifier: 'alpha' },
          { identifierType: 'user', identifier: 'bob' },
        ],
      })
    );
    expect(result?.isSingle).toBe(false);
    expect(result?.entities).toHaveLength(2);
  });

  it('marks single-element entities list as isSingle=true', () => {
    const result = normaliseEntityAttachment(
      buildAttachment({ entities: [{ identifierType: 'service', identifier: 'svc1' }] })
    );
    expect(result?.isSingle).toBe(true);
  });

  it('filters out malformed entries in the entities array', () => {
    const result = normaliseEntityAttachment(
      buildAttachment({
        entities: [
          { identifierType: 'host', identifier: 'alpha' },
          { identifierType: 'nope', identifier: 'oops' },
          { identifier: 'missing-type' },
          null,
        ],
      })
    );
    expect(result?.entities).toHaveLength(1);
    expect(result?.entities[0].identifier).toBe('alpha');
  });

  it('returns null when payload is missing', () => {
    expect(normaliseEntityAttachment(buildAttachment(null))).toBeNull();
  });

  it('returns null when neither shape is valid', () => {
    expect(
      normaliseEntityAttachment(buildAttachment({ foo: 'bar' }))
    ).toBeNull();
    expect(
      normaliseEntityAttachment(buildAttachment({ identifierType: 'host' }))
    ).toBeNull();
    expect(
      normaliseEntityAttachment(buildAttachment({ identifierType: 'host', identifier: '' }))
    ).toBeNull();
  });

  it('returns null when entities array is empty after filtering', () => {
    expect(
      normaliseEntityAttachment(buildAttachment({ entities: [{ bad: true }] }))
    ).toBeNull();
  });
});
