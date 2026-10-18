/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlGenerationDataset } from './dataset';
import { checkGoldQueries, fixtureIndices } from './fixtures/gold_queries';

const formatChecks = (checks: Awaited<ReturnType<typeof checkGoldQueries>>): string =>
  checks
    .map(
      ({ index, question, errors }) =>
        `  #${index} ${question.slice(0, 72)}…\n    ${errors.join('\n    ')}`
    )
    .join('\n');

describe('esqlGenerationDataset', () => {
  it('has 31 examples', () => {
    expect(esqlGenerationDataset).toHaveLength(31);
  });

  it('every entry has a non-empty input.question', () => {
    for (const example of esqlGenerationDataset) {
      expect(typeof example.input?.question).toBe('string');
      expect((example.input?.question ?? '').length).toBeGreaterThan(0);
    }
  });

  it('every entry has a non-empty output.query', () => {
    for (const example of esqlGenerationDataset) {
      expect(typeof example.output?.query).toBe('string');
      expect((example.output?.query ?? '').length).toBeGreaterThan(0);
    }
  });

  describe('gold queries against the fixture mappings', () => {
    // Regression guard for the whole class of defect this suite shipped with:
    // a gold query naming a column the fixtures do not map (or not being valid
    // ES|QL at all) makes `ES|QL Result Equivalence` and `ES|QL Execution
    // Validity` score 0 for every model, no matter what the model answers, and
    // hands the LLM judge a reference that cannot be executed.
    it('checks every gold query in the dataset', async () => {
      const checks = await checkGoldQueries();
      expect(checks).toHaveLength(esqlGenerationDataset.length);

      const broken = checks.filter(({ errors }) => errors.length > 0);
      if (broken.length > 0) {
        throw new Error(
          `${broken.length} of ${checks.length} gold queries cannot run against the fixture indices ` +
            `(${fixtureIndices.map(({ name }) => name).join(', ')}):\n${formatChecks(broken)}`
        );
      }
    });

    it.each(esqlGenerationDataset.map((example, index) => [index, example] as const))(
      'resolves gold query #%i against at least one fixture index',
      async (_index, example) => {
        const [check] = await checkGoldQueries([example]);
        expect(check.sources.length).toBeGreaterThan(0);
        expect(check.matchedIndices.length).toBeGreaterThan(0);
      }
    );

    // Guards the guard: a validator that silently accepts everything would let
    // the two cases above pass forever. Both defects were live in the dataset.
    it('flags an unmapped column and a gold that is not valid ES|QL', async () => {
      const checks = await checkGoldQueries([
        {
          input: { question: 'unmapped column' },
          output: { query: 'FROM logs-*\n| WHERE transaction.duration > 1000' },
        },
        {
          input: { question: 'not a query' },
          output: { query: 'Pagination is not supported' },
        },
        {
          input: { question: 'literal the client validator will not widen' },
          output: { query: 'FROM logs-*\n| WHERE destination.port NOT IN (22)' },
        },
        {
          // The validator stops at the first error of an expression, so the
          // `NOT IN` complaint above used to be the only thing reported here
          // and this gold passed the check while the cluster rejected it with
          // `Unknown column [direction]`.
          input: { question: 'unmapped column behind a literal the validator will not widen' },
          output: {
            query:
              'FROM logs-*\n| WHERE destination.port NOT IN (80, 443) and direction == "outbound"',
          },
        },
        {
          // The validator leaves a DISSECT/GROK source field unresolved
          // (`DISSECT definitely_not_a_field …` validates clean), so the check
          // resolves it itself: the fixture maps `user_agent.original` only.
          input: { question: 'dissect source the mappings do not have' },
          output: {
            query: 'FROM logs-*\n| DISSECT user_agent "%{browser_name}/%{browser_version}"',
          },
        },
      ]);

      expect(checks[0].errors.join('; ')).toContain('transaction.duration');
      expect(checks[1].errors.length).toBeGreaterThan(0);
      // The client validator rejects this one; Elasticsearch executes it. The
      // check must not turn that disagreement into a dataset failure.
      expect(checks[2].errors).toEqual([]);
      expect(checks[3].errors.join('; ')).toContain('direction');
      expect(checks[4].errors.join('; ')).toContain('user_agent');
    });

    // Columns an `ENRICH <policy>` contributes come from a cluster policy, not
    // from these mappings, so they must not be reported as mapping mismatches
    // even though the offline validator cannot resolve them.
    it('does not blame the mappings for columns an ENRICH policy provides', async () => {
      const [check] = await checkGoldQueries([
        {
          input: { question: 'enrich' },
          output: {
            query:
              'FROM logs-*\n| STATS code_count = COUNT(event.code) BY event.code\n| ENRICH win_events ON event.code WITH EVENT_DESCRIPTION\n| KEEP EVENT_DESCRIPTION',
          },
        },
      ]);

      expect(check.errors).toEqual([]);
      expect(check.warnings.join('; ')).toContain('win_events');
    });
  });
});
