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
  describeAttachmentForRow,
  ENTITY_STORE_ENTITY_ID_FIELD,
  ENTITY_STORE_ENTITY_NAME_FIELD,
  ENTITY_STORE_ENTITY_TYPE_FIELD,
  type AttachmentIdentifierType,
} from './entity_attachment_utils';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';

describe('buildSingleEntityAttachmentId', () => {
  it('produces an id with the expected prefix and a 64-char hex hash', () => {
    const id = buildSingleEntityAttachmentId('user', 'lena.medhurst@acmecrm.com');
    expect(id).toMatch(new RegExp(`^${SecurityAgentBuilderAttachments.entity}:user:[a-f0-9]{64}$`));
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
      const suffix = id.slice(
        `${SecurityAgentBuilderAttachments.entity}:${identifierType}:`.length
      );
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
    expect(id).toMatch(new RegExp(`^${SecurityAgentBuilderAttachments.entity}:list:[a-f0-9]{64}$`));
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

describe('describeAttachmentForRow', () => {
  const columns = [
    { name: ENTITY_STORE_ENTITY_TYPE_FIELD },
    { name: ENTITY_STORE_ENTITY_ID_FIELD },
    { name: ENTITY_STORE_ENTITY_NAME_FIELD },
  ];

  it('includes the raw entity.id as entityStoreId when present', () => {
    const row = [
      'user',
      "user:Lena Medhurst@Lena's MacBook Pro@local",
      "Lena Medhurst@Lena's MacBook Pro",
    ];
    const descriptor = describeAttachmentForRow({ columns, row });
    expect(descriptor).toEqual({
      identifierType: 'user',
      identifier: "Lena Medhurst@Lena's MacBook Pro",
      attachmentLabel: "user: Lena Medhurst@Lena's MacBook Pro",
      entityStoreId: "user:Lena Medhurst@Lena's MacBook Pro@local",
    });
  });

  it('omits entityStoreId when entity.id is missing from the row', () => {
    const row = ['host', null, 'LAPTOP-SALES04'];
    const descriptor = describeAttachmentForRow({ columns, row });
    expect(descriptor).toEqual({
      identifierType: 'host',
      identifier: 'LAPTOP-SALES04',
      attachmentLabel: 'host: LAPTOP-SALES04',
    });
    expect(descriptor).not.toHaveProperty('entityStoreId');
  });

  it('omits entityStoreId when entity.id is an empty string', () => {
    const row = ['host', '', 'LAPTOP-SALES04'];
    const descriptor = describeAttachmentForRow({ columns, row });
    expect(descriptor).not.toHaveProperty('entityStoreId');
  });

  it('falls back to the stripped entity.id for the identifier when entity.name is missing', () => {
    const row = ['host', 'host:LAPTOP-SALES04', null];
    const descriptor = describeAttachmentForRow({ columns, row });
    expect(descriptor).toEqual({
      identifierType: 'host',
      identifier: 'LAPTOP-SALES04',
      attachmentLabel: 'host: LAPTOP-SALES04',
      entityStoreId: 'host:LAPTOP-SALES04',
    });
  });

  it('returns null when the entity type cell is not a known identifier type', () => {
    const row = ['unknown', 'whatever:x', 'whatever'];
    expect(describeAttachmentForRow({ columns, row })).toBeNull();
  });

  it('returns null when neither entity.name nor entity.id yield an identifier', () => {
    const row = ['user', null, null];
    expect(describeAttachmentForRow({ columns, row })).toBeNull();
  });
});
