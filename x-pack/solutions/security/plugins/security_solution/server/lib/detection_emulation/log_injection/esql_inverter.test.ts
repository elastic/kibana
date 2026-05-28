/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractEsqlConstraints } from './esql_inverter';

describe('ES|QL Inverter', () => {
  describe('extractEsqlConstraints', () => {
    it('returns esql type', () => {
      const result = extractEsqlConstraints('FROM logs*');
      expect(result.type).toBe('esql');
    });

    it('returns empty constraints for query with no WHERE', () => {
      const result = extractEsqlConstraints('FROM logs*');
      expect(result.constraints).toEqual([]);
    });

    it('returns empty constraints for invalid query', () => {
      const result = extractEsqlConstraints('NOT VALID ESQL ??? !!!');
      expect(result.constraints).toEqual([]);
    });

    describe('equality comparisons', () => {
      it('extracts == comparison', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE event.category == "process"'
        );
        expect(result.constraints).toEqual([
          { field: 'event.category', operator: '==', value: 'process' },
        ]);
      });

      it('extracts != comparison', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE event.outcome != "success"'
        );
        expect(result.constraints).toEqual([
          { field: 'event.outcome', operator: '!=', value: 'success', negated: true },
        ]);
      });

      it('handles reversed comparison (value == field)', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE "process" == event.category'
        );
        expect(result.constraints).toEqual([
          { field: 'event.category', operator: '==', value: 'process' },
        ]);
      });
    });

    describe('range comparisons', () => {
      it('extracts > comparison', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE process.pid > 1000'
        );
        expect(result.constraints).toEqual([
          { field: 'process.pid', operator: '>', value: 1000 },
        ]);
      });

      it('extracts >= comparison', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE source.bytes >= 4096'
        );
        expect(result.constraints).toEqual([
          { field: 'source.bytes', operator: '>=', value: 4096 },
        ]);
      });

      it('extracts < comparison', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE event.duration < 5000'
        );
        expect(result.constraints).toEqual([
          { field: 'event.duration', operator: '<', value: 5000 },
        ]);
      });

      it('extracts <= comparison', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE event.risk_score <= 50'
        );
        expect(result.constraints).toEqual([
          { field: 'event.risk_score', operator: '<=', value: 50 },
        ]);
      });

      it('flips operator for reversed range (value < field → field > value)', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE 100 < source.bytes'
        );
        expect(result.constraints).toEqual([
          { field: 'source.bytes', operator: '>', value: 100 },
        ]);
      });
    });

    describe('logical operators', () => {
      it('extracts from both sides of AND', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE event.category == "process" AND process.name == "cmd.exe"'
        );
        expect(result.constraints).toHaveLength(2);
        expect(result.constraints).toEqual(
          expect.arrayContaining([
            { field: 'event.category', operator: '==', value: 'process' },
            { field: 'process.name', operator: '==', value: 'cmd.exe' },
          ])
        );
      });

      it('extracts from first branch of OR (heuristic)', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE process.name == "cmd.exe" OR process.name == "powershell.exe"'
        );
        expect(result.constraints).toEqual([
          { field: 'process.name', operator: '==', value: 'cmd.exe' },
        ]);
      });

      it('skips NOT expressions', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE event.category == "process" AND NOT event.outcome == "success"'
        );
        expect(result.constraints).toEqual([
          { field: 'event.category', operator: '==', value: 'process' },
        ]);
      });

      it('handles nested AND/OR', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE event.category == "authentication" AND (event.outcome == "failure" OR event.outcome == "error")'
        );
        expect(result.constraints).toHaveLength(2);
        expect(result.constraints[0]).toEqual({
          field: 'event.category',
          operator: '==',
          value: 'authentication',
        });
        // OR picks first branch
        expect(result.constraints[1]).toEqual({
          field: 'event.outcome',
          operator: '==',
          value: 'failure',
        });
      });
    });

    describe('LIKE and RLIKE', () => {
      it('extracts LIKE as wildcard constraint', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE process.command_line LIKE "%mimikatz%"'
        );
        expect(result.constraints).toEqual([
          { field: 'process.command_line', operator: 'wildcard', value: '*mimikatz*' },
        ]);
      });

      it('extracts RLIKE as regex constraint', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE process.name RLIKE "cmd.exe|powershell.exe"'
        );
        expect(result.constraints).toEqual([
          { field: 'process.name', operator: 'regex', value: 'cmd.exe|powershell.exe' },
        ]);
      });

      it('skips NOT LIKE', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE event.category == "process" AND process.name NOT LIKE "%svchost%"'
        );
        expect(result.constraints).toEqual([
          { field: 'event.category', operator: '==', value: 'process' },
        ]);
      });

      it('skips NOT RLIKE', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE event.category == "process" AND process.name NOT RLIKE "normal.*"'
        );
        expect(result.constraints).toEqual([
          { field: 'event.category', operator: '==', value: 'process' },
        ]);
      });
    });

    describe('IN operator', () => {
      it('extracts IN with string list', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE process.name IN ("cmd.exe", "powershell.exe", "bash")'
        );
        expect(result.constraints).toEqual([
          {
            field: 'process.name',
            operator: 'in',
            value: ['cmd.exe', 'powershell.exe', 'bash'],
          },
        ]);
      });

      it('extracts IN with numeric list', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE destination.port IN (22, 23, 3389)'
        );
        expect(result.constraints).toEqual([
          { field: 'destination.port', operator: 'in', value: [22, 23, 3389] },
        ]);
      });
    });

    describe('IS NULL / IS NOT NULL', () => {
      it('extracts IS NOT NULL as exists constraint', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE threat.indicator.ip IS NOT NULL'
        );
        expect(result.constraints).toEqual([
          { field: 'threat.indicator.ip', operator: 'exists', value: true },
        ]);
      });

      it('skips IS NULL (want positive constraints)', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE event.category == "process" AND process.parent.name IS NULL'
        );
        expect(result.constraints).toEqual([
          { field: 'event.category', operator: '==', value: 'process' },
        ]);
      });
    });

    describe('aggregating queries', () => {
      it('extracts constraints from first WHERE only, ignores threshold WHERE', () => {
        const result = extractEsqlConstraints(
          'FROM logs* | WHERE event.category == "authentication" AND event.outcome == "failure" | STATS failed = COUNT(*) BY user.name | WHERE failed > 10'
        );
        // Should only get constraints from the first WHERE
        expect(result.constraints).toEqual(
          expect.arrayContaining([
            { field: 'event.category', operator: '==', value: 'authentication' },
            { field: 'event.outcome', operator: '==', value: 'failure' },
          ])
        );
        // Should NOT include "failed > 10" since that's an aggregation result filter
        expect(result.constraints).toHaveLength(2);
      });
    });

    describe('complex real-world queries', () => {
      it('handles auth failure detection pattern', () => {
        const result = extractEsqlConstraints(
          'FROM logs-* | WHERE event.category == "authentication" AND event.outcome == "failure" | STATS failed_attempts = COUNT(*) BY user.name, source.ip | WHERE failed_attempts > 10 | SORT failed_attempts DESC | LIMIT 50'
        );
        expect(result.constraints).toEqual(
          expect.arrayContaining([
            { field: 'event.category', operator: '==', value: 'authentication' },
            { field: 'event.outcome', operator: '==', value: 'failure' },
          ])
        );
        expect(result.constraints).toHaveLength(2);
      });

      it('handles multi-condition process detection', () => {
        const result = extractEsqlConstraints(
          'FROM logs-* | WHERE event.category == "process" AND process.name == "cmd.exe" AND process.args LIKE "%/c%"'
        );
        expect(result.constraints).toHaveLength(3);
        expect(result.constraints).toEqual(
          expect.arrayContaining([
            { field: 'event.category', operator: '==', value: 'process' },
            { field: 'process.name', operator: '==', value: 'cmd.exe' },
            { field: 'process.args', operator: 'wildcard', value: '*/c*' },
          ])
        );
      });
    });
  });
});
