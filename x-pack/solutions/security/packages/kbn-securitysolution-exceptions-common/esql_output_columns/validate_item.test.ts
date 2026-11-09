/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntryValueProblems, getEsqlOutputColumnsItemErrors } from './validate_item';
import type { ValidateEsqlOutputColumnsItemOptions } from './validate_item';

const esqlItem = (
  overrides: Partial<ValidateEsqlOutputColumnsItemOptions> = {}
): ValidateEsqlOutputColumnsItemOptions => ({
  appliesTo: 'esql_output_columns',
  entries: [
    { column_type: 'keyword', field: 'target_host', type: 'match', value: 'dc-01' },
    { column_type: 'ip', field: 'src_ip', type: 'match_any', value: ['10.0.0.1', '10.0.0.2'] },
    { column_type: 'text', field: 'user', type: 'wildcard', value: 'svc-*' },
    { column_type: 'double', field: 'score', type: 'exists' },
  ],
  listType: 'rule_default',
  osTypes: [],
  ...overrides,
});

describe('items that apply to the source documents', () => {
  it.each([undefined, null, 'source_documents' as const])(
    'accepts an item with applies_to %p and no column_type',
    (appliesTo) => {
      expect(
        getEsqlOutputColumnsItemErrors({
          appliesTo,
          entries: [
            { field: 'host.name', type: 'match', value: 'dc-01' },
            {
              entries: [{ field: 'name', type: 'match', value: 'x' }],
              field: 'process',
              type: 'nested',
            },
            { field: 'ip', type: 'list' },
          ],
          listType: 'endpoint',
          osTypes: ['linux'],
        })
      ).toEqual([]);
    }
  );

  it('rejects a column_type on a top level entry', () => {
    expect(
      getEsqlOutputColumnsItemErrors({
        appliesTo: undefined,
        entries: [{ column_type: 'keyword', field: 'host.name', type: 'match', value: 'x' }],
        listType: 'detection',
        osTypes: [],
      })
    ).toEqual([
      'column_type can only be set on the entries of an item that applies to "esql_output_columns" (found on the fields "host.name")',
    ]);
  });

  it('rejects a column_type on a nested entry', () => {
    const errors = getEsqlOutputColumnsItemErrors({
      appliesTo: 'source_documents',
      entries: [
        {
          entries: [{ column_type: 'keyword', field: 'name', type: 'match', value: 'x' }],
          field: 'process',
          type: 'nested',
        },
      ],
      listType: 'detection',
      osTypes: [],
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"name"');
  });
});

describe('items that apply to the ES|QL output columns', () => {
  it('accepts a valid item in a detection or a rule_default list', () => {
    expect(getEsqlOutputColumnsItemErrors(esqlItem())).toEqual([]);
    expect(getEsqlOutputColumnsItemErrors(esqlItem({ listType: 'detection' }))).toEqual([]);
  });

  it('accepts an item when the list type is not known', () => {
    expect(getEsqlOutputColumnsItemErrors(esqlItem({ listType: undefined }))).toEqual([]);
  });

  it.each([
    'endpoint',
    'endpoint_trusted_apps',
    'endpoint_trusted_devices',
    'endpoint_events',
    'endpoint_host_isolation_exceptions',
    'endpoint_blocklists',
    'endpoint_custom_yara_signatures',
  ])('is not allowed in a %s list', (listType) => {
    const errors = getEsqlOutputColumnsItemErrors(esqlItem({ listType }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(`the type "${listType}"`);
  });

  it('is not allowed with os_types', () => {
    expect(getEsqlOutputColumnsItemErrors(esqlItem({ osTypes: ['linux'] }))).toEqual([
      'an item that applies to "esql_output_columns" cannot have os_types',
    ]);
  });

  it('needs a column_type on every entry', () => {
    expect(
      getEsqlOutputColumnsItemErrors(
        esqlItem({ entries: [{ field: 'target_host', type: 'match', value: 'x' }] })
      )
    ).toEqual(['the entry on the field "target_host" needs a column_type']);
  });

  it('does not support value lists or nested entries', () => {
    const errors = getEsqlOutputColumnsItemErrors(
      esqlItem({
        entries: [
          { column_type: 'ip', field: 'ip', type: 'list' },
          { column_type: 'keyword', entries: [], field: 'process', type: 'nested' },
        ],
      })
    );
    expect(errors).toEqual([
      'the entry on the field "ip" has the type "list", and only match, match_any, wildcard and exists are supported',
      'the entry on the field "process" has the type "nested", and only match, match_any, wildcard and exists are supported',
    ]);
  });

  it('rejects an unknown column_type', () => {
    expect(
      getEsqlOutputColumnsItemErrors(
        esqlItem({
          entries: [{ column_type: 'geo_point', field: 'c', type: 'match', value: 'x' }],
        })
      )
    ).toEqual([
      'the entry on the field "c" has the column_type "geo_point", which is not supported',
    ]);
  });

  describe('the entry type and the column type', () => {
    it.each([
      ['match', 'double'],
      ['match_any', 'double'],
      ['wildcard', 'ip'],
      ['wildcard', 'long'],
      ['wildcard', 'date'],
      ['wildcard', 'boolean'],
    ] as const)('rejects %s on a %s column', (type, columnType) => {
      const errors = getEsqlOutputColumnsItemErrors(
        esqlItem({
          entries: [
            {
              column_type: columnType,
              field: 'c',
              type,
              value: type === 'match_any' ? ['1'] : '1',
            },
          ],
        })
      );
      expect(errors).toEqual([
        `the entry on the field "c" of type ${type} is not supported on a column of type ${columnType}`,
      ]);
    });

    it.each(['exists', 'match', 'match_any', 'wildcard'] as const)(
      'accepts %s on a keyword column, and exists on every type',
      (type) => {
        expect(
          getEsqlOutputColumnsItemErrors(
            esqlItem({
              entries: [
                {
                  column_type: 'keyword',
                  field: 'c',
                  type,
                  ...(type === 'match_any'
                    ? { value: ['a'] }
                    : type === 'exists'
                    ? {}
                    : { value: 'a' }),
                },
              ],
            })
          )
        ).toEqual([]);
      }
    );
  });

  describe('the values', () => {
    it.each([
      ['match', 'ip', 'bogus'],
      ['match', 'long', '1e3'],
      ['match', 'integer', '2147483648'],
      ['match', 'unsigned_long', '-1'],
      ['match', 'boolean', 'maybe'],
      ['match', 'version', '1.2.3.4'],
      ['match', 'date', 'yesterday'],
      ['match', 'date_nanos', '2262-04-11T23:47:16.854775808Z'],
    ] as const)('rejects a %s value on a %s column: %p', (type, columnType, value) => {
      const errors = getEsqlOutputColumnsItemErrors(
        esqlItem({ entries: [{ column_type: columnType, field: 'c', type, value }] })
      );
      expect(errors).toEqual([
        `the entry on the field "c": value "${value}" is not valid for a column of type ${columnType}`,
      ]);
    });

    it('names every value of a match_any entry that does not fit', () => {
      const errors = getEsqlOutputColumnsItemErrors(
        esqlItem({
          entries: [
            {
              column_type: 'ip',
              field: 'src_ip',
              type: 'match_any',
              value: ['10.0.0.1', 'bogus', 'nope'],
            },
          ],
        })
      );
      expect(errors).toEqual([
        'the entry on the field "src_ip": value "bogus" is not valid for a column of type ip',
        'the entry on the field "src_ip": value "nope" is not valid for a column of type ip',
      ]);
    });

    it('rejects a wildcard that ends in a lone backslash', () => {
      expect(
        getEsqlOutputColumnsItemErrors(
          esqlItem({
            entries: [{ column_type: 'keyword', field: 'c', type: 'wildcard', value: 'abc\\' }],
          })
        )
      ).toEqual(['the entry on the field "c": value "abc\\" cannot end in a lone backslash']);
    });

    it('accepts any string on a keyword or a text column', () => {
      expect(
        getEsqlOutputColumnsItemErrors(
          esqlItem({
            entries: [
              { column_type: 'keyword', field: 'a', type: 'match', value: '" | LIMIT 0 //' },
              { column_type: 'text', field: 'b', type: 'match', value: '`; DROP' },
            ],
          })
        )
      ).toEqual([]);
    });
  });
});

describe('getEntryValueProblems', () => {
  it('has no problem for a valid value, for an entry that is not complete, and for exists', () => {
    expect(getEntryValueProblems({ type: 'match', column_type: 'ip', value: '10.0.0.1' })).toEqual(
      []
    );
    expect(getEntryValueProblems({ type: 'match', value: 'bogus' })).toEqual([]);
    expect(getEntryValueProblems({ type: 'match', column_type: 'nope', value: 'bogus' })).toEqual(
      []
    );
    expect(getEntryValueProblems({ type: 'exists', column_type: 'ip' })).toEqual([]);
    expect(getEntryValueProblems({ type: 'match', column_type: 'ip' })).toEqual([]);
  });

  it('has one problem for a value that does not fit the column type', () => {
    expect(getEntryValueProblems({ type: 'match', column_type: 'ip', value: 'bogus' })).toEqual([
      {
        value: 'bogus',
        problem: { code: 'value_not_valid_for_column_type', value: 'bogus', columnType: 'ip' },
      },
    ]);
  });

  it('has one problem for each value of a list that does not fit', () => {
    const problems = getEntryValueProblems({
      type: 'match_any',
      column_type: 'integer',
      value: ['1', 'many', '2', 'few'],
    });
    expect(problems.map(({ value }) => value)).toEqual(['many', 'few']);
  });

  it('has a problem for a pattern that ends with a backslash and for a pattern that is too long', () => {
    expect(
      getEntryValueProblems({ type: 'wildcard', column_type: 'keyword', value: 'abc\\' }).map(
        ({ problem }) => problem.code
      )
    ).toEqual(['wildcard_ends_with_backslash']);
    expect(
      getEntryValueProblems({
        type: 'wildcard',
        column_type: 'keyword',
        value: 'a'.repeat(1001),
      }).map(({ problem }) => problem.code)
    ).toEqual(['wildcard_too_long']);
  });

  it('has a problem for an entry type that the column type does not support', () => {
    expect(
      getEntryValueProblems({ type: 'wildcard', column_type: 'long', value: '4*' }).map(
        ({ problem }) => problem.code
      )
    ).toEqual(['entry_type_not_supported_on_column_type']);
  });
});
