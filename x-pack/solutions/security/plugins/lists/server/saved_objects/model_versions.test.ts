/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  exceptionListModelVersions,
  exceptionListSchemaV1,
  exceptionListSchemaV2,
} from './model_versions';
import { exceptionListAgnosticType, exceptionListType } from './exception_list';

const list = {
  created_at: '2026-10-01T00:00:00.000Z',
  created_by: 'elastic',
  description: 'list',
  immutable: false,
  list_id: 'list-1',
  list_type: 'list',
  name: 'list',
  os_types: [],
  tags: ['tag'],
  tie_breaker_id: 'tie-breaker',
  type: 'detection',
  updated_by: 'elastic',
  version: 1,
};

const legacyItem = {
  comments: [
    {
      comment: 'a comment',
      created_at: '2026-10-01T00:00:00.000Z',
      created_by: 'elastic',
      id: 'c1',
    },
  ],
  created_at: '2026-10-01T00:00:00.000Z',
  created_by: 'elastic',
  description: 'item',
  entries: [
    { field: 'host.name', operator: 'included', type: 'match', value: 'dc-01' },
    { field: 'src_ip', operator: 'included', type: 'match_any', value: ['10.0.0.1', '10.0.0.2'] },
    {
      entries: [{ field: 'name', operator: 'included', type: 'match', value: 'x' }],
      field: 'process',
      type: 'nested',
    },
    { field: 'ip', list: { id: 'list-of-ips', type: 'ip' }, operator: 'included', type: 'list' },
    { field: 'user', operator: 'excluded', type: 'exists' },
  ],
  expire_time: '2027-01-01T00:00:00.000Z',
  item_id: 'item-1',
  list_id: 'list-1',
  list_type: 'item',
  meta: { temporaryUuid: 'abc' },
  name: 'item',
  os_types: ['linux'],
  tags: [],
  tie_breaker_id: 'tie-breaker',
  type: 'simple',
  updated_by: 'elastic',
};

const esqlItem = {
  ...legacyItem,
  applies_to: 'esql_output_columns',
  entries: [
    {
      column_type: 'keyword',
      field: 'target_host',
      operator: 'included',
      type: 'match',
      value: 'dc-01',
    },
  ],
  os_types: [],
};

describe('exception list saved object model versions', () => {
  it('has the baseline and the version that adds applies_to and column_type, in this order', () => {
    expect(Object.keys(exceptionListModelVersions)).toEqual(['1', '2']);
  });

  it('is registered on both types, which share one shape', () => {
    expect(exceptionListType.modelVersions).toBe(exceptionListModelVersions);
    expect(exceptionListAgnosticType.modelVersions).toBe(exceptionListModelVersions);
    expect(exceptionListType.mappings).toEqual(exceptionListAgnosticType.mappings);
  });

  describe('the baseline (1)', () => {
    it('has no changes, because the initial model version of a type can only have schemas', () => {
      expect((exceptionListModelVersions[1] as { changes: unknown[] }).changes).toEqual([]);
    });

    it.each([
      ['a list', list],
      ['an item', legacyItem],
      ['an item with no optional attribute', { list_type: 'item', type: 'simple' }],
    ])('accepts %s as it is stored today', (_, document) => {
      expect(() => exceptionListSchemaV1.validate(document)).not.toThrow();
    });

    it('allows the attributes that it does not know, like the ones that later versions add', () => {
      expect(exceptionListSchemaV1.validate(esqlItem)).toEqual(esqlItem);
    });
  });

  describe('the version that adds applies_to and column_type (2)', () => {
    it('adds only mappings, as keywords with ignore_above', () => {
      expect((exceptionListModelVersions[2] as { changes: unknown[] }).changes).toEqual([
        {
          addedMappings: {
            applies_to: { ignore_above: 1024, type: 'keyword' },
            entries: { properties: { column_type: { ignore_above: 1024, type: 'keyword' } } },
          },
          type: 'mappings_addition',
        },
      ]);
    });

    it('maps what it adds in the mappings of the types', () => {
      const { properties } = exceptionListType.mappings;
      expect(properties.applies_to).toEqual({ ignore_above: 1024, type: 'keyword' });
      expect(
        (properties.entries as { properties: Record<string, unknown> }).properties.column_type
      ).toEqual({ ignore_above: 1024, type: 'keyword' });
    });

    it.each([
      ['a list', list],
      ['an item that does not say what it applies to', legacyItem],
      [
        'an item that applies to the source documents',
        { ...legacyItem, applies_to: 'source_documents' },
      ],
      ['an item that applies to the ES|QL output columns', esqlItem],
    ])('accepts %s', (_, document) => {
      expect(() => exceptionListSchemaV2.validate(document)).not.toThrow();
    });

    it('does not accept a column_type or an applies_to that is not a string', () => {
      expect(() => exceptionListSchemaV2.validate({ ...legacyItem, applies_to: 1 })).toThrow();
      expect(() =>
        exceptionListSchemaV2.validate({
          ...legacyItem,
          entries: [{ column_type: 1, field: 'f', type: 'match', value: 'x' }],
        })
      ).toThrow();
    });
  });

  describe('reading a document that a newer version wrote', () => {
    const forwardCompatibility = (
      version: 1 | 2
    ): { validate: (document: unknown) => Record<string, unknown> } =>
      (
        exceptionListModelVersions[version]?.schemas as unknown as {
          forwardCompatibility: { validate: (document: unknown) => Record<string, unknown> };
        }
      ).forwardCompatibility;

    it('lets the baseline drop the attributes that it does not know', () => {
      expect(forwardCompatibility(1).validate(esqlItem)).not.toHaveProperty('applies_to');
    });

    it('keeps what version 2 adds', () => {
      expect(forwardCompatibility(2).validate(esqlItem)).toHaveProperty(
        'applies_to',
        'esql_output_columns'
      );
    });

    it('keeps the column_type of the entries, which are objects that allow unknown attributes', () => {
      const { entries } = forwardCompatibility(1).validate(esqlItem) as {
        entries: Array<Record<string, unknown>>;
      };
      expect(entries[0].column_type).toBe('keyword');
    });
  });
});
