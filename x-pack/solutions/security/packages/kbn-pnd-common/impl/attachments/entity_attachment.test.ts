/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';
import { extractConversationEntities } from './entity_attachment';

const makeAttachment = (data: unknown, type = 'security.entity'): VersionedAttachment => ({
  id: 'att-1',
  type,
  current_version: 1,
  versions: [{ version: 1, data, created_at: '2026-01-01T00:00:00Z', content_hash: 'abc' }],
});

describe('extractConversationEntities', () => {
  it('returns empty array for no attachments', () => {
    expect(extractConversationEntities([])).toEqual([]);
  });

  it('ignores non-security.entity attachment types', () => {
    const att = makeAttachment({ identifierType: 'user', identifier: 'alice' }, 'other.type');
    expect(extractConversationEntities([att])).toEqual([]);
  });

  it('handles single-entity shape', () => {
    const att = makeAttachment({ identifierType: 'user', identifier: 'cfo@corp' });
    expect(extractConversationEntities([att])).toEqual([{ id: 'user:cfo@corp', name: 'cfo@corp' }]);
  });

  it('uses entityStoreId as id when present', () => {
    const att = makeAttachment({
      identifierType: 'user',
      identifier: 'cfo@corp',
      entityStoreId: 'user:cfo@corp@acme@default',
    });
    expect(extractConversationEntities([att])).toEqual([
      { id: 'user:cfo@corp@acme@default', name: 'cfo@corp' },
    ]);
  });

  it('handles multi-entity shape', () => {
    const att = makeAttachment({
      entities: [
        { identifierType: 'host', identifier: 'srv-db02' },
        { identifierType: 'user', identifier: 'admin' },
      ],
    });
    expect(extractConversationEntities([att])).toEqual([
      { id: 'host:srv-db02', name: 'srv-db02' },
      { id: 'user:admin', name: 'admin' },
    ]);
  });

  it('drops malformed rows in multi-entity shape without throwing', () => {
    const att = makeAttachment({
      entities: [
        { identifierType: 'host', identifier: 'good-host' },
        { notAnEntity: true },
        null,
      ],
    });
    expect(extractConversationEntities([att])).toEqual([{ id: 'host:good-host', name: 'good-host' }]);
  });

  it('drops attachment with malformed data without throwing', () => {
    const att = makeAttachment('not an object');
    expect(extractConversationEntities([att])).toEqual([]);
  });

  it('deduplicates entities across two attachments naming the same entity', () => {
    const att1 = makeAttachment({ identifierType: 'user', identifier: 'cfo@corp' });
    const att2 = makeAttachment({ identifierType: 'user', identifier: 'cfo@corp' });
    expect(extractConversationEntities([att1, att2])).toHaveLength(1);
  });

  it('treats entityStoreId as identity — same id from two different identifier values dedupes', () => {
    const att1 = makeAttachment({
      identifierType: 'user',
      identifier: 'cfo',
      entityStoreId: 'user:cfo@corp@acme@default',
    });
    const att2 = makeAttachment({
      identifierType: 'user',
      identifier: 'cfo@corp',
      entityStoreId: 'user:cfo@corp@acme@default',
    });
    const result = extractConversationEntities([att1, att2]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('user:cfo@corp@acme@default');
  });

  it('skips attachment version not matching current_version', () => {
    const att: VersionedAttachment = {
      id: 'att-stale',
      type: 'security.entity',
      current_version: 2,
      versions: [
        { version: 1, data: { identifierType: 'user', identifier: 'old' }, created_at: '', content_hash: '' },
      ],
    };
    expect(extractConversationEntities([att])).toEqual([]);
  });
});
