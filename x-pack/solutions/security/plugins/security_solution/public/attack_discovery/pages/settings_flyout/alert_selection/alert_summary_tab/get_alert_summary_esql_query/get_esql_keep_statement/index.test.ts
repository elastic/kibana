/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlKeepStatement } from '.';

describe('getEsqlKeepStatement', () => {
  it('renames the field when tableStackBy0 is "kibana.alert.rule.name"', () => {
    const result = getEsqlKeepStatement('kibana.alert.rule.name');

    expect(result).toBe(
      '| RENAME kibana.alert.rule.name AS `Rule name`\n| KEEP `Rule name`, Count'
    );
  });

  it('does NOT rename the field when tableStackBy0 is NOT "kibana.alert.rule.name"', () => {
    const result = getEsqlKeepStatement('some.other.field');

    expect(result).toBe('| KEEP `some.other.field`, Count');
  });
});
