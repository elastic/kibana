/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformDiffableFieldValues } from './diffable_rule_fields_mappings';

describe('transformDiffableFieldValues', () => {
  it('transforms rule_schedule into "from" value', () => {
    const result = transformDiffableFieldValues('from', { interval: '5m', lookback: '4m' });
    expect(result).toEqual({ type: 'TRANSFORMED_FIELD', value: 'now-540s' });
  });
});
