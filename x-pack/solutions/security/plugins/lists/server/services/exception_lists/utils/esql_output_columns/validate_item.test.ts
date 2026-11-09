/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BadRequestError } from '@kbn/securitysolution-es-utils';
import type { ValidateEsqlOutputColumnsItemOptions } from '@kbn/securitysolution-exceptions-common/esql_output_columns';

import { validateEsqlOutputColumnsItem } from './validate_item';

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

describe('validateEsqlOutputColumnsItem', () => {
  it('returns when the item is valid', () => {
    expect(() => validateEsqlOutputColumnsItem(esqlItem())).not.toThrow();
  });

  it('throws a bad request error that names each problem once', () => {
    const run = (): void =>
      validateEsqlOutputColumnsItem(
        esqlItem({
          entries: [{ column_type: 'ip', field: 'c', type: 'match', value: 'bogus' }],
          listType: 'endpoint',
          osTypes: ['linux'],
        })
      );
    expect(run).toThrow(BadRequestError);
    expect(run).toThrow(/^Invalid exception item: /);
    expect(run).toThrow(/cannot have os_types/);
    expect(run).toThrow(/the type "endpoint"/);
    expect(run).toThrow(/value "bogus" is not valid for a column of type ip/);
  });

  it('reports at most 10 problems and counts the others', () => {
    const entries = Array.from({ length: 13 }, (_, i) => ({
      column_type: 'ip',
      field: `c${i}`,
      type: 'match',
      value: `bogus${i}`,
    }));
    let message = '';
    try {
      validateEsqlOutputColumnsItem(esqlItem({ entries }));
    } catch (error) {
      ({ message } = error);
    }
    expect(message.match(/is not valid for a column of type ip/g)).toHaveLength(10);
    expect(message).toMatch(/; and 3 more$/);
  });
});
