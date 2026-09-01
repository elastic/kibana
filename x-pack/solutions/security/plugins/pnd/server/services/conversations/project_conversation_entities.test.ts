/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';
import { projectConversationEntities } from './project_conversation_entities';

const makeAttachment = (data: unknown, type = 'security.entity'): VersionedAttachment => ({
  id: 'att-1',
  type,
  current_version: 1,
  versions: [{ version: 1, data, created_at: '2026-01-01T00:00:00Z', content_hash: 'abc' }],
});

describe('projectConversationEntities', () => {
  it('returns empty array when attachments is undefined', () => {
    expect(projectConversationEntities({ attachments: undefined })).toEqual([]);
  });

  it('returns empty array for empty attachments', () => {
    expect(projectConversationEntities({ attachments: [] })).toEqual([]);
  });

  it('extracts entities from security.entity attachments', () => {
    const result = projectConversationEntities({
      attachments: [makeAttachment({ identifierType: 'user', identifier: 'alice' })],
    });
    expect(result).toEqual([{ id: 'user:alice', name: 'alice' }]);
  });

  it('ignores non-security.entity attachments', () => {
    const result = projectConversationEntities({
      attachments: [
        makeAttachment({ identifierType: 'user', identifier: 'alice' }, 'other.type'),
        makeAttachment({ identifierType: 'host', identifier: 'srv-01' }),
      ],
    });
    expect(result).toEqual([{ id: 'host:srv-01', name: 'srv-01' }]);
  });

  it('handles multi-entity attachment shape', () => {
    const result = projectConversationEntities({
      attachments: [
        makeAttachment({
          entities: [
            { identifierType: 'host', identifier: 'h1' },
            { identifierType: 'user', identifier: 'u1' },
          ],
        }),
      ],
    });
    expect(result).toHaveLength(2);
  });
});
