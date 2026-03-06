/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFindingsQuery } from './use_latest_findings';

describe('getFindingsQuery', () => {
  const baseOptions = {
    query: { bool: { filter: [], must: [], must_not: [], should: [] } },
    sort: [['@timestamp', 'desc']],
    enabled: true,
    pageSize: 25,
  };
  const emptyRulesStates = {};

  describe('sort behavior', () => {
    it('uses regular field sort with unmapped_type for standard fields', () => {
      const result = getFindingsQuery(
        { ...baseOptions, sort: [['@timestamp', 'desc']] },
        emptyRulesStates,
        undefined
      );

      expect(result.sort).toEqual([{ '@timestamp': { order: 'desc', unmapped_type: 'keyword' } }]);
    });

    it('uses painless script sort for case-insensitive fields', () => {
      const result = getFindingsQuery(
        { ...baseOptions, sort: [['rule.section', 'asc']] },
        emptyRulesStates,
        undefined
      );

      expect(result.sort).toEqual([
        {
          _script: {
            type: 'string',
            order: 'asc',
            script: expect.objectContaining({
              lang: 'painless',
            }),
          },
        },
      ]);
    });

    it('uses high sentinel for missing values in ascending script sort', () => {
      const result = getFindingsQuery(
        { ...baseOptions, sort: [['rule.section', 'asc']] },
        emptyRulesStates,
        undefined
      );

      const script = result.sort![0] as { _script: { script: { source: string } } };
      // Missing values should use high sentinel (U+FFFF) so they sort last in ascending order
      expect(script._script.script.source).toContain('\uffff');
      expect(script._script.script.source).not.toContain(': ""');
    });

    it('uses empty string for missing values in descending script sort', () => {
      const result = getFindingsQuery(
        { ...baseOptions, sort: [['rule.section', 'desc']] },
        emptyRulesStates,
        undefined
      );

      const script = result.sort![0] as { _script: { script: { source: string } } };
      // Missing values should use empty string so they sort last in descending order
      expect(script._script.script.source).toContain(': ""');
      expect(script._script.script.source).not.toContain('\uffff');
    });

    it('handles missing fields safely with containsKey check', () => {
      const result = getFindingsQuery(
        { ...baseOptions, sort: [['resource.sub_type', 'asc']] },
        emptyRulesStates,
        undefined
      );

      const script = result.sort![0] as { _script: { script: { source: string } } };
      expect(script._script.script.source).toContain('doc.containsKey');
      expect(script._script.script.source).toContain('!doc["resource.sub_type"].empty');
    });

    it('applies case-insensitive sorting for resource.name', () => {
      const result = getFindingsQuery(
        { ...baseOptions, sort: [['resource.name', 'desc']] },
        emptyRulesStates,
        undefined
      );

      const script = result.sort![0] as { _script: { script: { source: string } } };
      expect(script._script.script.source).toContain('.toLowerCase()');
    });

    it('does not use runtime_mappings', () => {
      const result = getFindingsQuery(
        { ...baseOptions, sort: [['rule.section', 'asc']] },
        emptyRulesStates,
        undefined
      );

      expect(result).not.toHaveProperty('runtime_mappings');
    });
  });
});
