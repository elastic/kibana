/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformDiffableFieldValues } from './diffable_rule_fields_mappings';

describe('transformDiffableFieldValues', () => {
  it('does NOT transform "from" in rule_schedule', () => {
    const result = transformDiffableFieldValues('from', {
      interval: '5m',
      from: 'now-10m',
      to: 'now',
    });

    expect(result).toEqual({ type: 'NON_TRANSFORMED_FIELD' });
  });

  it('does NOT transform "to" in rule_schedule', () => {
    const result = transformDiffableFieldValues('to', {
      interval: '5m',
      from: 'now-10m',
      to: 'now',
    });

    expect(result).toEqual({ type: 'NON_TRANSFORMED_FIELD' });
  });
});
