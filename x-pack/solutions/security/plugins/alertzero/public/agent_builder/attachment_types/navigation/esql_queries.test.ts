/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildThreatReportLookupEsql } from './esql_queries';

describe('esql_queries', () => {
  it('builds threat report lookup ES|QL scoped to the current space and global sentinel', () => {
    expect(buildThreatReportLookupEsql({ reportId: 'default:fp1', spaceId: 'soc' })).toBe(
      'FROM ".kibana-threat-reports*" METADATA _id | WHERE _id IN ("default:fp1") AND ' +
        'space_id IN ("soc", "*")'
    );
  });

  it('escapes quotes and backslashes in the report id and space id', () => {
    // Both values reach a double-quoted ES|QL literal, and the report id comes from an
    // attachment payload, so an unescaped quote would let it break out of the literal.
    expect(buildThreatReportLookupEsql({ reportId: 'r"1\\x', spaceId: 'sp"ace' })).toBe(
      'FROM ".kibana-threat-reports*" METADATA _id | WHERE _id IN ("r\\"1\\\\x") AND ' +
        'space_id IN ("sp\\"ace", "*")'
    );
  });
});
