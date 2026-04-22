/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACHMENT_IDENTIFIER_TYPES,
  buildListEntityAttachmentId,
  buildSingleEntityAttachmentId,
  type AttachmentIdentifierType,
} from './entity_attachment_utils';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';

describe('buildSingleEntityAttachmentId', () => {
  it('produces an id with the expected prefix and a 64-char hex hash', () => {
    const id = buildSingleEntityAttachmentId('user', 'lena.medhurst@acmecrm.com');
    expect(id).toMatch(
      new RegExp(`^${SecurityAgentBuilderAttachments.entity}:user:[a-f0-9]{64}$`)
    );
  });

  it('is deterministic for the same (type, identifier) pair', () => {
    const a = buildSingleEntityAttachmentId('user', 'lena.medhurst@acmecrm.com');
    const b = buildSingleEntityAttachmentId('user', 'lena.medhurst@acmecrm.com');
    expect(a).toBe(b);
  });

  it('produces different ids for different identifier types', () => {
    const userId = buildSingleEntityAttachmentId('user', 'same-identifier');
    const hostId = buildSingleEntityAttachmentId('host', 'same-identifier');
    expect(userId).not.toBe(hostId);
  });

  it('produces different ids for different identifier values', () => {
    const a = buildSingleEntityAttachmentId('user', 'alice');
    const b = buildSingleEntityAttachmentId('user', 'bob');
    expect(a).not.toBe(b);
  });

  it.each(ATTACHMENT_IDENTIFIER_TYPES)(
    'contains no autolink-triggering characters after the type prefix for type %s',
    (identifierType: AttachmentIdentifierType) => {
      const id = buildSingleEntityAttachmentId(identifierType, 'lena.medhurst@acmecrm.com');
      const suffix = id.slice(`${SecurityAgentBuilderAttachments.entity}:${identifierType}:`.length);
      expect(suffix).toMatch(/^[a-f0-9]{64}$/);
      expect(suffix).not.toMatch(/[@.:/]/);
    }
  );
});

describe('buildListEntityAttachmentId', () => {
  it('produces an id with the expected prefix and a 64-char hex hash', () => {
    const id = buildListEntityAttachmentId([
      { identifierType: 'user', identifier: 'alice' },
      { identifierType: 'host', identifier: 'server1' },
    ]);
    expect(id).toMatch(
      new RegExp(`^${SecurityAgentBuilderAttachments.entity}:list:[a-f0-9]{64}$`)
    );
  });

  it('is stable regardless of entity ordering', () => {
    const a = buildListEntityAttachmentId([
      { identifierType: 'user', identifier: 'alice' },
      { identifierType: 'host', identifier: 'server1' },
    ]);
    const b = buildListEntityAttachmentId([
      { identifierType: 'host', identifier: 'server1' },
      { identifierType: 'user', identifier: 'alice' },
    ]);
    expect(a).toBe(b);
  });
});
