/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlKeepStatement } from '.';

describe('getEsqlKeepStatement', () => {
  it("renames the rule name (and risk score) when tableStackBy0 is 'kibana.alert.rule.name'", () => {
    const result = getEsqlKeepStatement('kibana.alert.rule.name');

    expect(result).toBe(
      '| RENAME kibana.alert.rule.name AS `Rule name`, kibana.alert.risk_score AS `Risk score`\n| KEEP `Rule name`, `Risk score`, @timestamp, host.name, user.name'
    );
  });

  it("it does NOT rename the table stack by field when tableStackBy0 is NOT 'kibana.alert.rule.name'", () => {
    const result = getEsqlKeepStatement('some.other.field');

    expect(result).toBe(
      '| RENAME kibana.alert.risk_score AS `Risk score`\n| KEEP `some.other.field`, `Risk score`, @timestamp, host.name, user.name'
    );
  });

  it('returns the expected statement when tableStackBy0 is an empty string', () => {
    const result = getEsqlKeepStatement('');
    expect(result).toBe(
      '| RENAME kibana.alert.risk_score AS `Risk score`\n| KEEP ``, `Risk score`, @timestamp, host.name, user.name'
    );
  });
});
