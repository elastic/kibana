/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
    expect(
      convertHighlightedFieldsToTableRow(highlightedFields, scopeId, showCellActions, undefined)
    ).toEqual([
      {
        field: 'host.name',
        description: {
          field: 'host.name',
          values: ['host-1'],
          scopeId: 'scopeId',
          showCellActions,
          ancestorsIndexName: undefined,
          entityId: undefined,
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
    expect(
      convertHighlightedFieldsToTableRow(highlightedFields, scopeId, showCellActions, undefined)
    ).toEqual([
      {
        field: 'host.name-override',
        description: {
          field: 'host.name-override',
          originalField: 'host.name',
          values: ['host-1'],
          scopeId: 'scopeId',
          showCellActions,
          ancestorsIndexName: undefined,
          entityId: undefined,
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
    expect(
      convertHighlightedFieldsToTableRow(highlightedFields, scopeId, showCellActions, undefined)
    ).toEqual([
      {
        field: 'host.name-override',
        description: {
          field: 'host.name-override',
          originalField: 'host.name',
          values: ['value override!'],
          scopeId: 'scopeId',
          showCellActions,
          ancestorsIndexName: undefined,
          entityId: undefined,
        },
      },
    ]);
  });

  it('should pass ancestorsIndexName and entityId through to each row', () => {
    const highlightedFields = {
      'host.name': { values: ['my-host'] },
      'user.name': { values: ['my-user'] },
    };
    const result = convertHighlightedFieldsToTableRow(
      highlightedFields,
      scopeId,
      showCellActions,
      'ancestors-index',
      'entity-123'
    );
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.description.ancestorsIndexName === 'ancestors-index')).toBe(true);
    expect(result.every((r) => r.description.entityId === 'entity-123')).toBe(true);
  });

  it('should not set entityId when omitted', () => {
    const highlightedFields = {
      'process.name': { values: ['node.exe'] },
    };
    const result = convertHighlightedFieldsToTableRow(highlightedFields, scopeId, showCellActions);
    expect(result[0].description.entityId).toBeUndefined();
  });
});
