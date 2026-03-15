/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  convertHighlightedFieldsToPrevalenceFilters,
  convertHighlightedFieldsToTableRow,
} from './highlighted_fields_helpers';

const scopeId = 'scopeId';
const showCellActions = false;

describe('convertHighlightedFieldsToTableRow', () => {
  it('should convert highlighted fields to a table row', () => {
    const highlightedFields = {
      'host.name': {
        values: ['host-1'],
      },
    };
    expect(convertHighlightedFieldsToTableRow(highlightedFields, scopeId, showCellActions)).toEqual(
      [
        {
          field: 'host.name',
          description: {
            field: 'host.name',
            values: ['host-1'],
            scopeId: 'scopeId',
            showCellActions,
            entityIdentifiers: { 'host.name': 'host-1' },
          },
        },
      ]
    );
  });

  it('should convert take override name over default name and use original values if not present in the override', () => {
    const highlightedFields = {
      'host.name': {
        overrideField: { field: 'host.name-override', values: [] },
        values: ['host-1'],
      },
    };
    expect(convertHighlightedFieldsToTableRow(highlightedFields, scopeId, showCellActions)).toEqual(
      [
        {
          field: 'host.name-override',
          description: {
            field: 'host.name-override',
            originalField: 'host.name',
            values: ['host-1'],
            scopeId: 'scopeId',
            showCellActions,
            entityIdentifiers: { 'host.name': 'host-1' },
          },
        },
      ]
    );
  });

  it('should convert take override name over default name and use provided values', () => {
    const highlightedFields = {
      'host.name': {
        overrideField: { field: 'host.name-override', values: ['value override!'] },
        values: ['host-1'],
      },
    };
    expect(convertHighlightedFieldsToTableRow(highlightedFields, scopeId, showCellActions)).toEqual(
      [
        {
          field: 'host.name-override',
          description: {
            field: 'host.name-override',
            originalField: 'host.name',
            values: ['value override!'],
            scopeId: 'scopeId',
            showCellActions,
            entityIdentifiers: { 'host.name': 'host-1' },
          },
        },
      ]
    );
  });

  it('should build entityIdentifiers from EUID fields for host.name', () => {
    const highlightedFields = {
      'host.entity.id': { values: ['host-entity-123'] },
      'host.name': { values: ['my-host'] },
    };
    const result = convertHighlightedFieldsToTableRow(highlightedFields, scopeId, showCellActions);
    const hostNameRow = result.find((r) => r.field === 'host.name');
    expect(hostNameRow?.description.entityIdentifiers).toEqual({
      'host.entity.id': 'host-entity-123',
      'host.name': 'my-host',
    });
  });

  it('should build entityIdentifiers from EUID fields for user.name', () => {
    const highlightedFields = {
      'user.entity.id': { values: ['user-entity-456'] },
      'user.name': { values: ['my-user'] },
    };
    const result = convertHighlightedFieldsToTableRow(highlightedFields, scopeId, showCellActions);
    const userNameRow = result.find((r) => r.field === 'user.name');
    expect(userNameRow?.description.entityIdentifiers).toEqual({
      'user.entity.id': 'user-entity-456',
      'user.name': 'my-user',
    });
  });

  it('should filter user entityIdentifiers to exclude host fields so user.name shows user value and links to user panel', () => {
    const highlightedFields = {
      'host.name': { values: ['my-host'] },
      'user.name': { values: ['my-user'] },
    };
    const result = convertHighlightedFieldsToTableRow(highlightedFields, scopeId, showCellActions);
    const userNameRow = result.find((r) => r.field === 'user.name');
    const hostNameRow = result.find((r) => r.field === 'host.name');
    // user.name row should only have user.* keys (getUserEntityIdentifiers adds host fields when user.name exists)
    expect(Object.keys(userNameRow?.description.entityIdentifiers ?? {})).toEqual(['user.name']);
    expect(userNameRow?.description.entityIdentifiers?.['user.name']).toBe('my-user');
    // host.name row should only have host.* keys
    expect(Object.keys(hostNameRow?.description.entityIdentifiers ?? {})).toEqual(['host.name']);
    expect(hostNameRow?.description.entityIdentifiers?.['host.name']).toBe('my-host');
  });

  it('should not add entityIdentifiers for non-host/user fields', () => {
    const highlightedFields = {
      'process.name': { values: ['node.exe'] },
    };
    const result = convertHighlightedFieldsToTableRow(highlightedFields, scopeId, showCellActions);
    expect(result[0].description.entityIdentifiers).toBeUndefined();
  });
});

describe('convertHighlightedFieldsToPrevalenceFilters', () => {
  it('should convert highlighted fields to prevalence filters', () => {
    const highlightedFields = {
      'host.name': {
        values: ['host-1'],
      },
      'user.name': {
        values: ['user-1', 'user-2'],
      },
    };
    expect(convertHighlightedFieldsToPrevalenceFilters(highlightedFields)).toEqual({
      'host.name': { terms: { 'host.name': ['host-1'] } },
      'user.name': { terms: { 'user.name': ['user-1', 'user-2'] } },
    });
  });
});
