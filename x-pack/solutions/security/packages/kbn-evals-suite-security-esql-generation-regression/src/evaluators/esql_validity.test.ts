/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEsqlValidityEvaluator, ESQL_VALIDITY_EVALUATOR_NAME } from './esql_validity';

const params = (output: unknown) => ({
  input: {},
  output,
  expected: null,
  metadata: null,
});

const identityExtractor = (output: unknown) => output as string[];

describe('createEsqlValidityEvaluator', () => {
  describe('evaluator metadata', () => {
    it('has the correct name and kind', () => {
      const evaluator = createEsqlValidityEvaluator({ queryExtractor: () => [] });
      expect(evaluator.name).toBe(ESQL_VALIDITY_EVALUATOR_NAME);
      expect(evaluator.kind).toBe('CODE');
    });

    it('allows a name override', () => {
      const evaluator = createEsqlValidityEvaluator({
        queryExtractor: () => [],
        name: 'Custom Validity',
      });
      expect(evaluator.name).toBe('Custom Validity');
    });
  });

  describe('valid ES|QL queries', () => {
    const evaluator = createEsqlValidityEvaluator({ queryExtractor: identityExtractor });

    it('scores 1.0 for a simple FROM query', async () => {
      const result = await evaluator.evaluate(params(['FROM logs-*']));
      expect(result.score).toBe(1);
      expect(result.label).toBe('valid');
    });

    it('scores 1.0 for FROM with WHERE and STATS', async () => {
      const result = await evaluator.evaluate(
        params([
          'FROM logs-* | WHERE event.action == "login" | STATS count = COUNT(*) BY user.name',
        ])
      );
      expect(result.score).toBe(1);
      expect(result.label).toBe('valid');
    });

    it('scores 1.0 for ROW literal expressions', async () => {
      const result = await evaluator.evaluate(
        params([
          'ROW a = 1, b = "hello", c = true',
          'ROW overall_score = 75, status = "AMBER", green = 3, red = 2',
        ])
      );
      expect(result.score).toBe(1);
      expect(result.label).toBe('valid');
      expect(result.metadata?.totalQueries).toBe(2);
      expect(result.metadata?.validCount).toBe(2);
    });

    it('scores 1.0 for SHOW commands', async () => {
      const result = await evaluator.evaluate(params(['SHOW INFO']));
      expect(result.score).toBe(1);
    });

    it('scores 1.0 for FROM with LIMIT', async () => {
      const result = await evaluator.evaluate(params(['FROM logs-* | LIMIT 100']));
      expect(result.score).toBe(1);
    });

    it('scores 1.0 for FROM with SORT', async () => {
      const result = await evaluator.evaluate(params(['FROM logs-* | SORT @timestamp DESC']));
      expect(result.score).toBe(1);
    });

    it('scores 1.0 for FROM with EVAL', async () => {
      const result = await evaluator.evaluate(
        params(['FROM logs-* | EVAL duration_s = event.duration / 1000000000'])
      );
      expect(result.score).toBe(1);
    });

    it('scores 1.0 for FROM with KEEP and RENAME', async () => {
      const result = await evaluator.evaluate(
        params(['FROM logs-* | KEEP @timestamp, host.name, message | RENAME host.name AS hostname'])
      );
      expect(result.score).toBe(1);
    });

    it('scores 1.0 for FROM with DISSECT', async () => {
      const result = await evaluator.evaluate(
        params(['FROM logs-* | DISSECT message "%{clientip} %{ident} %{auth}"'])
      );
      expect(result.score).toBe(1);
    });

    it('scores 1.0 for FROM with GROK', async () => {
      const result = await evaluator.evaluate(
        params(['FROM logs-* | GROK message "%{IP:clientip} %{WORD:verb} %{URIPATHPARAM:request}"'])
      );
      expect(result.score).toBe(1);
    });

    it('scores 1.0 for named parameters (?_tstart and ?_tend)', async () => {
      const result = await evaluator.evaluate(
        params([
          'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS count = COUNT(*)',
        ])
      );
      expect(result.score).toBe(1);
    });

    it('scores 1.0 for a complex multi-pipe query', async () => {
      const result = await evaluator.evaluate(
        params([
          `FROM logs-*
           | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
           | WHERE event.action == "authentication_failure"
           | STATS failure_count = COUNT(*) BY source.ip, user.name
           | WHERE failure_count > 10
           | SORT failure_count DESC
           | LIMIT 20`,
        ])
      );
      expect(result.score).toBe(1);
    });

    it('scores 1.0 for multiple valid queries in a single output', async () => {
      const result = await evaluator.evaluate(
        params([
          'FROM logs-* | LIMIT 10',
          'ROW x = 42',
          'FROM metrics-* | STATS avg_cpu = AVG(system.cpu.total.pct) BY host.name',
        ])
      );
      expect(result.score).toBe(1);
      expect(result.metadata?.totalQueries).toBe(3);
      expect(result.metadata?.validCount).toBe(3);
      expect(result.metadata?.invalidCount).toBe(0);
    });

    it('scores 1.0 for FROM with DROP', async () => {
      const result = await evaluator.evaluate(params(['FROM logs-* | DROP message, tags']));
      expect(result.score).toBe(1);
    });

    it('scores 1.0 for FROM with ENRICH', async () => {
      const result = await evaluator.evaluate(
        params(['FROM logs-* | ENRICH my_policy ON ip_address'])
      );
      expect(result.score).toBe(1);
    });

    it('scores 1.0 for case-insensitive keywords (lowercase)', async () => {
      const result = await evaluator.evaluate(
        params(['from logs-* | where @timestamp > now() - 1 hour | limit 5'])
      );
      expect(result.score).toBe(1);
    });
  });

  describe('invalid ES|QL queries', () => {
    const evaluator = createEsqlValidityEvaluator({ queryExtractor: identityExtractor });

    it('scores 0 for descriptive text instead of ES|QL', async () => {
      const result = await evaluator.evaluate(
        params(['PCI DSS v4.0.1 Compliance Check - Violations Found'])
      );
      expect(result.score).toBe(0);
      expect(result.label).toBe('invalid');
      expect(result.metadata?.invalidCount).toBe(1);
    });

    it('scores 0 for a descriptive label that looks like a title', async () => {
      const result = await evaluator.evaluate(params(['PCI DSS v4.0.1 Compliance Scorecard']));
      expect(result.score).toBe(0);
    });

    it('scores 0 for SQL instead of ES|QL', async () => {
      const result = await evaluator.evaluate(params(['SELECT * FROM users WHERE active = true']));
      expect(result.score).toBe(0);
      expect(result.label).toBe('invalid');
    });

    it('scores 0 for incomplete pipe expression', async () => {
      const result = await evaluator.evaluate(params(['FROM logs-* |']));
      expect(result.score).toBe(0);
    });

    it('scores 0 for random text', async () => {
      const result = await evaluator.evaluate(
        params(['this is not a query at all, just some random text'])
      );
      expect(result.score).toBe(0);
    });

    it('scores 0 for invalid command after FROM', async () => {
      const result = await evaluator.evaluate(params(['FROM logs-* | INVALID_COMMAND foo']));
      expect(result.score).toBe(0);
    });

    it('scores 0 for empty string query', async () => {
      const result = await evaluator.evaluate(params(['']));
      expect(result.score).toBe(0);
      expect(result.label).toBe('invalid');
    });

    it('scores 0 for whitespace-only query', async () => {
      const result = await evaluator.evaluate(params(['   ']));
      expect(result.score).toBe(0);
    });

    it('provides detailed error messages for invalid queries', async () => {
      const result = await evaluator.evaluate(params(['this is garbage']));
      expect(result.score).toBe(0);
      expect(result.explanation).toContain('failed validation');
      expect(result.metadata?.queries).toBeDefined();

      const queries = result.metadata?.queries as Array<{
        query: string;
        valid: boolean;
        errors: string[];
      }>;
      expect(queries[0].valid).toBe(false);
      expect(queries[0].errors.length).toBeGreaterThan(0);
    });
  });

  describe('mixed valid and invalid queries', () => {
    const evaluator = createEsqlValidityEvaluator({ queryExtractor: identityExtractor });

    it('scores 0 when any query is invalid (strict mode)', async () => {
      const result = await evaluator.evaluate(
        params(['FROM logs-* | LIMIT 10', 'PCI DSS Compliance Scorecard', 'ROW x = 1'])
      );
      expect(result.score).toBe(0);
      expect(result.label).toBe('invalid');
      expect(result.metadata?.totalQueries).toBe(3);
      expect(result.metadata?.validCount).toBe(2);
      expect(result.metadata?.invalidCount).toBe(1);
    });

    it('reports all invalid queries in explanation', async () => {
      const result = await evaluator.evaluate(
        params(['not valid esql', 'FROM logs-* | LIMIT 5', 'also not valid'])
      );
      expect(result.score).toBe(0);
      expect(result.metadata?.invalidCount).toBe(2);
      expect(result.explanation).toContain('2 of 3');
    });
  });

  describe('scoreOnEmptyQueries option', () => {
    it('scores 1.0 when extractor returns empty array (default)', async () => {
      const evaluator = createEsqlValidityEvaluator({ queryExtractor: () => [] });
      const result = await evaluator.evaluate(params({}));
      expect(result.score).toBe(1);
      expect(result.label).toBe('no-queries');
      expect(result.explanation).toContain('No ES|QL queries');
    });

    it('honours scoreOnEmptyQueries: 0', async () => {
      const evaluator = createEsqlValidityEvaluator({
        queryExtractor: () => [],
        scoreOnEmptyQueries: 0,
      });
      const result = await evaluator.evaluate(params({}));
      expect(result.score).toBe(0);
      expect(result.label).toBe('no-queries');
    });

    it('honours scoreOnEmptyQueries: 0.5', async () => {
      const evaluator = createEsqlValidityEvaluator({
        queryExtractor: () => [],
        scoreOnEmptyQueries: 0.5,
      });
      const result = await evaluator.evaluate(params({}));
      expect(result.score).toBe(0.5);
      expect(result.label).toBe('no-queries');
    });
  });

  describe('edge cases', () => {
    it('scores 0 when extractor throws an error', async () => {
      const evaluator = createEsqlValidityEvaluator({
        queryExtractor: () => {
          throw new Error('Output format unexpected');
        },
      });
      const result = await evaluator.evaluate(params({ unexpected: 'format' }));
      expect(result.score).toBe(0);
      expect(result.label).toBe('error');
      expect(result.explanation).toContain('Query extractor threw');
      expect(result.explanation).toContain('Output format unexpected');
    });

    it('handles null output gracefully via extractor', async () => {
      const evaluator = createEsqlValidityEvaluator({
        queryExtractor: (output) => (output == null ? [] : (output as string[])),
      });
      const result = await evaluator.evaluate(params(null));
      expect(result.score).toBe(1);
      expect(result.label).toBe('no-queries');
    });

    it('handles non-string values in the extracted array', async () => {
      const evaluator = createEsqlValidityEvaluator({
        queryExtractor: (output) => output as string[],
      });
      const result = await evaluator.evaluate(
        params([null as unknown as string, undefined as unknown as string])
      );
      expect(result.score).toBe(0);
      expect(result.label).toBe('invalid');
    });
  });

  describe('real-world Agent Builder tool output patterns', () => {
    it('validates esqlResults query fields from tool output', async () => {
      const toolOutput = {
        toolResults: [
          {
            type: 'esqlResults',
            data: {
              query:
                'FROM logs-pci-auth-eval | WHERE event.action == "authentication_failure" | STATS failure_count = COUNT(*) BY source.ip, user.name | WHERE failure_count > 10',
              columns: [
                { name: 'source.ip', type: 'keyword' },
                { name: 'user.name', type: 'keyword' },
                { name: 'failure_count', type: 'long' },
              ],
              values: [['10.0.0.5', 'jdoe', 12]],
            },
          },
          {
            type: 'esqlResults',
            data: {
              query:
                'ROW overall_score = 41, status = "RED", green = 0, amber = 27, red = 2, not_assessable = 0',
              columns: [
                { name: 'overall_score', type: 'integer' },
                { name: 'status', type: 'keyword' },
              ],
              values: [[41, 'RED', 0, 27, 2, 0]],
            },
          },
        ],
      };

      const evaluator = createEsqlValidityEvaluator({
        queryExtractor: (output: unknown) => {
          const out = output as typeof toolOutput;
          return out.toolResults.filter((r) => r.type === 'esqlResults').map((r) => r.data.query);
        },
      });

      const result = await evaluator.evaluate(params(toolOutput));
      expect(result.score).toBe(1);
      expect(result.label).toBe('valid');
      expect(result.metadata?.totalQueries).toBe(2);
    });

    it('catches descriptive text in esqlResults query field (the original bug)', async () => {
      const toolOutput = {
        toolResults: [
          {
            type: 'esqlResults',
            data: {
              query: 'PCI DSS v4.0.1 Compliance Check - Violations Found',
              columns: [{ name: 'requirement', type: 'keyword' }],
              values: [['8.1.6']],
            },
          },
        ],
      };

      const evaluator = createEsqlValidityEvaluator({
        queryExtractor: (output: unknown) => {
          const out = output as typeof toolOutput;
          return out.toolResults.filter((r) => r.type === 'esqlResults').map((r) => r.data.query);
        },
      });

      const result = await evaluator.evaluate(params(toolOutput));
      expect(result.score).toBe(0);
      expect(result.label).toBe('invalid');
      expect(result.explanation).toContain('PCI DSS');
    });

    it('validates query fields from ToolResultType.query entries', async () => {
      const toolOutput = {
        toolResults: [
          {
            type: 'query',
            data: {
              esql: 'FROM logs-* | WHERE event.category == "authentication" | LIMIT 100',
            },
          },
        ],
      };

      const evaluator = createEsqlValidityEvaluator({
        queryExtractor: (output: unknown) => {
          const out = output as typeof toolOutput;
          return out.toolResults.filter((r) => r.type === 'query').map((r) => r.data.esql);
        },
      });

      const result = await evaluator.evaluate(params(toolOutput));
      expect(result.score).toBe(1);
      expect(result.label).toBe('valid');
    });
  });

  describe('explanation grammar', () => {
    const evaluator = createEsqlValidityEvaluator({ queryExtractor: identityExtractor });

    it('uses singular for single valid query', async () => {
      const result = await evaluator.evaluate(params(['FROM logs-*']));
      expect(result.explanation).toContain('1 ES|QL query is');
    });

    it('uses plural for multiple valid queries', async () => {
      const result = await evaluator.evaluate(params(['FROM logs-*', 'ROW x = 1']));
      expect(result.explanation).toContain('2 ES|QL queries are');
    });

    it('uses singular for single invalid query', async () => {
      const result = await evaluator.evaluate(params(['not valid']));
      expect(result.explanation).toContain('1 of 1 ES|QL query failed');
    });

    it('uses plural for multiple queries with failures', async () => {
      const result = await evaluator.evaluate(params(['not valid', 'FROM logs-*', 'also bad']));
      expect(result.explanation).toContain('2 of 3 ES|QL queries failed');
    });
  });
});
