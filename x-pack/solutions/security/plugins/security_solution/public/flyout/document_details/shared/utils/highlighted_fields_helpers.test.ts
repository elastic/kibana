/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/library';
import { convertHighlightedFieldsToTableRow } from './highlighted_fields_helpers';

const scopeId = 'scopeId';
const showCellActions = false;

describe('convertHighlightedFieldsToTableRow', () => {
  it('should convert highlighted fields to a table row', () => {
    const highlightedFields = {
      'host.name': {
        values: ['host-1'],
      },
    };
    const flattened = { 'host.name': 'host-1' };
    const hostDocumentIdentityFields = euid.getEntityIdentifiersFromDocument('host', flattened);
    expect(
      convertHighlightedFieldsToTableRow(highlightedFields, scopeId, showCellActions, undefined, {
        hostDocumentIdentityFields,
      })
    ).toEqual([
      {
        field: 'host.name',
        description: {
          field: 'host.name',
          values: ['host-1'],
          scopeId: 'scopeId',
          showCellActions,
          identityFields: { 'host.name': 'host-1' },
        },
      },
    ]);
  });

  it('should convert take override name over default name and use original values if not present in the override', () => {
    const highlightedFields = {
      'host.name': {
        overrideField: { field: 'host.name-override', values: [] },
        values: ['host-1'],
      },
    };
    const flattened = { 'host.name': 'host-1' };
    const hostDocumentIdentityFields = euid.getEntityIdentifiersFromDocument('host', flattened);
    expect(
      convertHighlightedFieldsToTableRow(highlightedFields, scopeId, showCellActions, undefined, {
        hostDocumentIdentityFields,
      })
    ).toEqual([
      {
        field: 'host.name-override',
        description: {
          field: 'host.name-override',
          originalField: 'host.name',
          values: ['host-1'],
          scopeId: 'scopeId',
          showCellActions,
          identityFields: { 'host.name': 'host-1' },
        },
      },
    ]);
  });

  it('should convert take override name over default name and use provided values', () => {
    const highlightedFields = {
      'host.name': {
        overrideField: { field: 'host.name-override', values: ['value override!'] },
        values: ['host-1'],
      },
    };
    const flattened = { 'host.name': 'host-1' };
    const hostDocumentIdentityFields = euid.getEntityIdentifiersFromDocument('host', flattened);
    expect(
      convertHighlightedFieldsToTableRow(highlightedFields, scopeId, showCellActions, undefined, {
        hostDocumentIdentityFields,
      })
    ).toEqual([
      {
        field: 'host.name-override',
        description: {
          field: 'host.name-override',
          originalField: 'host.name',
          values: ['value override!'],
          scopeId: 'scopeId',
          showCellActions,
          identityFields: { 'host.name': 'host-1' },
        },
      },
    ]);
  });

  it('should build identityFields from EUID fields for host.name', () => {
    const highlightedFields = {
      'host.entity.id': { values: ['host-entity-123'] },
      'host.name': { values: ['my-host'] },
    };
    const flattened = {
      'host.entity.id': 'host-entity-123',
      'host.name': 'my-host',
    };
    const hostDocumentIdentityFields = euid.getEntityIdentifiersFromDocument('host', flattened);
    const result = convertHighlightedFieldsToTableRow(
      highlightedFields,
      scopeId,
      showCellActions,
      undefined,
      { hostDocumentIdentityFields }
    );
    const hostNameRow = result.find((r) => r.field === 'host.name');
    expect(hostNameRow?.description.identityFields).toEqual({
      'host.name': 'my-host',
    });
  });

  it('should build identityFields from EUID fields for user.name', () => {
    const highlightedFields = {
      'user.entity.id': { values: ['user-entity-456'] },
      'user.name': { values: ['my-user'] },
    };
    const flattened = {
      'user.entity.id': 'user-entity-456',
      'user.name': 'my-user',
      'event.module': 'okta',
    };
    const userDocumentIdentityFields = euid.getEntityIdentifiersFromDocument('user', flattened);
    const result = convertHighlightedFieldsToTableRow(
      highlightedFields,
      scopeId,
      showCellActions,
      undefined,
      { userDocumentIdentityFields }
    );
    const userNameRow = result.find((r) => r.field === 'user.name');
    expect(userNameRow?.description.identityFields).toEqual({
      'user.name': 'my-user',
    });
  });

  it('should filter user identityFields to exclude host fields so user.name shows user value and links to user panel', () => {
    const highlightedFields = {
      'host.name': { values: ['my-host'] },
      'user.name': { values: ['my-user'] },
    };
    const flattened = {
      'host.name': 'my-host',
      'user.name': 'my-user',
      'event.module': 'okta',
    };
    const hostDocumentIdentityFields = euid.getEntityIdentifiersFromDocument('host', flattened);
    const userDocumentIdentityFields = euid.getEntityIdentifiersFromDocument('user', flattened);
    const result = convertHighlightedFieldsToTableRow(
      highlightedFields,
      scopeId,
      showCellActions,
      undefined,
      { hostDocumentIdentityFields, userDocumentIdentityFields }
    );
    const userNameRow = result.find((r) => r.field === 'user.name');
    const hostNameRow = result.find((r) => r.field === 'host.name');
    expect(Object.keys(userNameRow?.description.identityFields ?? {})).toEqual(['user.name']);
    expect(userNameRow?.description.identityFields?.['user.name']).toBe('my-user');
    expect(Object.keys(hostNameRow?.description.identityFields ?? {})).toEqual(['host.name']);
    expect(hostNameRow?.description.identityFields?.['host.name']).toBe('my-host');
  });

  it('should not add identityFields for non-host/user fields', () => {
    const highlightedFields = {
      'process.name': { values: ['node.exe'] },
    };
    const result = convertHighlightedFieldsToTableRow(highlightedFields, scopeId, showCellActions);
    expect(result[0].description.identityFields).toBeUndefined();
  });
});
