/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getVulnerabilitiesQuery } from './use_latest_vulnerabilities';

describe('getVulnerabilitiesQuery sort', () => {
  const baseOptions = {
    query: { bool: { filter: [], must: [], must_not: [], should: [] } },
    enabled: true,
    pageSize: 25,
  };

  it.each(['vulnerability.score.risk', 'vulnerability.score.base'])(
    'sorts %s as float when unmapped so it does not conflict with the float mapping',
    (field) => {
      const { sort } = getVulnerabilitiesQuery({ ...baseOptions, sort: [[field, 'desc']] }, 0);

      expect(sort).toEqual([{ [field]: { order: 'desc', unmapped_type: 'float' } }]);
    }
  );

  it('keeps the keyword fallback for other fields', () => {
    const { sort } = getVulnerabilitiesQuery(
      { ...baseOptions, sort: [['vulnerability.severity', 'asc']] },
      0
    );

    expect(sort).toEqual([
      { 'vulnerability.severity': { order: 'asc', unmapped_type: 'keyword' } },
    ]);
  });
});
