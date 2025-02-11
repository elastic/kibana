/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFirstColumnName } from '.';

describe('getFirstColumnName', () => {
  it('returns the (static, intentionally NON-i18n) "Rule name" text when tableStackBy0 is "kibana.alert.rule.name"', () => {
    const tableStackBy0 = 'kibana.alert.rule.name';

    const result = getFirstColumnName(tableStackBy0);

    expect(result).toBe('Rule name');
  });

  it('returns the input string when tableStackBy0 is NOT "kibana.alert.rule.name"', () => {
    const tableStackBy0 = 'some.other.field';

    const result = getFirstColumnName(tableStackBy0);

    expect(result).toEqual(tableStackBy0);
  });
});
