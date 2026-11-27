/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import type { RuleCreationExample } from '../../datasets/golden';
import type { RuleCreationResult } from '../rule_creation_client';
import { draftRuleSchema } from '../types';
import {
  createFieldCoverageEvaluator,
  createIntervalFormatEvaluator,
  createLookbackGapEvaluator,
  createMitreAccuracyEvaluator,
  createQueryExecutabilityEvaluator,
  createQuerySyntaxValidityEvaluator,
  createRiskScoreValidityEvaluator,
  createRuleTypeLanguageEvaluator,
  createSeverityValidityEvaluator,
} from './dataset_evaluator';

// `expected` in EvaluatorParams is TExample['output'], i.e. RuleCreationExample['output'],
// not the full example — see EvaluatorParams<TExample> in @kbn/evals/src/types.ts.
const makeArgs = (
  rule: RuleCreationResult['rule'],
  expectedOutput: Partial<RuleCreationExample['output']> = {}
) => ({
  input: { technique: 'T1078', gap_description: '', evidence: '', confidence: 0.5 },
  output: { rule, pendingApproval: false, traceId: undefined } as RuleCreationResult,
  expected: { mitreIds: ['T1078'], language: 'esql' as const, ...expectedOutput },
  metadata: null,
});

const makeRule = (overrides: Record<string, unknown> = {}) => ({
  name: 'Test Rule',
  description: 'A test rule',
  query: 'FROM logs-endpoint.events.process-* | WHERE event.type == "start"',
  language: 'esql' as const,
  type: 'esql' as const,
  severity: 'high' as const,
  tags: ['test'],
  risk_score: 50,
  interval: '5m',
  from: 'now-10m',
  threat: [{ technique: [{ id: 'T1078', subtechnique: [] }] }],
  ...overrides,
});

const noRule = makeArgs(undefined);

// Invalid values must survive schema parsing so evaluators can score them 0 —
// a strict schema would fail the parse and turn every evaluator into N/A.
describe('draftRuleSchema', () => {
  it('parses a rule with invalid enum-like values instead of rejecting it', () => {
    const parsed = draftRuleSchema.safeParse(
      makeRule({ severity: 'urgent', type: 'query', language: 'kql', risk_score: '50' })
    );
    expect(parsed.success).toBe(true);
  });

  it('invalid values that survive parsing score 0 in their evaluators', async () => {
    const parsed = draftRuleSchema.parse(
      makeRule({ severity: 'urgent', type: 'query', risk_score: '50' })
    );
    const args = makeArgs(parsed as RuleCreationResult['rule']);
    expect((await createSeverityValidityEvaluator().evaluate(args)).score).toBe(0);
    expect((await createRuleTypeLanguageEvaluator().evaluate(args)).score).toBe(0);
    expect((await createRiskScoreValidityEvaluator().evaluate(args)).score).toBe(0);
  });
});

describe('createQuerySyntaxValidityEvaluator', () => {
  const evaluator = createQuerySyntaxValidityEvaluator();

  it('returns N/A when no rule', async () => {
    const result = await evaluator.evaluate(noRule);
    expect(result.label).toBe('N/A');
  });

  it('scores 1 for valid query with specific FROM', async () => {
    const result = await evaluator.evaluate(makeArgs(makeRule()));
    expect(result.score).toBe(1);
  });

  it('scores 0 for FROM *', async () => {
    const result = await evaluator.evaluate(makeArgs(makeRule({ query: 'FROM * | LIMIT 10' })));
    expect(result.score).toBe(0);
  });
});

describe('createRuleTypeLanguageEvaluator', () => {
  const evaluator = createRuleTypeLanguageEvaluator();

  it('scores 1 when type and language are both esql', async () => {
    const result = await evaluator.evaluate(makeArgs(makeRule()));
    expect(result.score).toBe(1);
  });

  it('scores 0 when type is wrong', async () => {
    const result = await evaluator.evaluate(makeArgs(makeRule({ type: 'query' })));
    expect(result.score).toBe(0);
  });
});

describe('createMitreAccuracyEvaluator', () => {
  const evaluator = createMitreAccuracyEvaluator();

  it('scores 1 for exact technique match', async () => {
    const result = await evaluator.evaluate(makeArgs(makeRule()));
    expect(result.score).toBe(1);
  });

  it('does not penalise optional techniques when present', async () => {
    const result = await evaluator.evaluate(
      makeArgs(
        makeRule({
          threat: [{ technique: [{ id: 'T1078', subtechnique: [{ id: 'T1078.001' }] }] }],
        }),
        { mitreIds: ['T1078'], optionalMitreIds: ['T1078.001'] }
      )
    );
    expect(result.score).toBe(1);
  });

  it('does not penalise optional techniques when absent', async () => {
    const result = await evaluator.evaluate(
      makeArgs(makeRule(), { mitreIds: ['T1078'], optionalMitreIds: ['T1078.001'] })
    );
    expect(result.score).toBe(1);
  });

  it('penalises extra non-optional techniques (precision drop)', async () => {
    const result = await evaluator.evaluate(
      makeArgs(
        makeRule({
          threat: [
            {
              technique: [
                { id: 'T1078', subtechnique: [] },
                { id: 'T1059', subtechnique: [] },
              ],
            },
          ],
        }),
        { mitreIds: ['T1078'] }
      )
    );
    expect(result.score).toBeLessThan(1);
  });

  describe('sub-technique nested under its parent (canonical threat shape)', () => {
    const nestedRule = (techniques: Array<{ id: string; subtechnique?: Array<{ id: string }> }>) =>
      makeRule({ threat: [{ technique: techniques }] });

    it('scores 1 when the required sub-technique is nested under its optional parent', async () => {
      const result = await evaluator.evaluate(
        makeArgs(nestedRule([{ id: 'T1053', subtechnique: [{ id: 'T1053.005' }] }]), {
          mitreIds: ['T1053.005'],
          optionalMitreIds: ['T1053'],
        })
      );
      expect(result.score).toBe(1);
      expect(result.metadata).toMatchObject({ precision: 1, recall: 1 });
    });

    it('still gives 0.5 recall credit when only the parent is tagged', async () => {
      const result = await evaluator.evaluate(
        makeArgs(nestedRule([{ id: 'T1053', subtechnique: [] }]), {
          mitreIds: ['T1053.005'],
          optionalMitreIds: ['T1053'],
        })
      );
      expect(result.metadata).toMatchObject({ precision: 0.5, recall: 0.5 });
      expect(result.score).toBe(0.5);
    });

    it('still penalises an unrelated extra technique next to the nested pair', async () => {
      const result = await evaluator.evaluate(
        makeArgs(
          nestedRule([
            { id: 'T1053', subtechnique: [{ id: 'T1053.005' }] },
            { id: 'T1059', subtechnique: [] },
          ]),
          { mitreIds: ['T1053.005'], optionalMitreIds: ['T1053'] }
        )
      );
      // T1053 is neutral; T1053.005 scores 1, T1059 scores 0 -> precision 0.5, recall 1.
      expect(result.metadata).toMatchObject({ precision: 0.5, recall: 1 });
      expect(result.score).toBeCloseTo(2 / 3);
    });

    it('does not penalise a sub-technique nested under a required parent', async () => {
      const result = await evaluator.evaluate(
        makeArgs(nestedRule([{ id: 'T1027', subtechnique: [{ id: 'T1027.010' }] }]), {
          mitreIds: ['T1027'],
        })
      );
      expect(result.score).toBe(1);
    });

    it('still penalises a sub-technique of a different parent than the required one', async () => {
      const result = await evaluator.evaluate(
        makeArgs(
          nestedRule([
            { id: 'T1027', subtechnique: [] },
            { id: 'T1059', subtechnique: [{ id: 'T1059.001' }] },
          ]),
          { mitreIds: ['T1027'] }
        )
      );
      expect(result.metadata).toMatchObject({ recall: 1 });
      expect(result.score).toBeLessThan(1);
    });
  });

  describe('optional families (sub-technique under an optional parent)', () => {
    const nestedRule = (techniques: Array<{ id: string; subtechnique?: Array<{ id: string }> }>) =>
      makeRule({ threat: [{ technique: techniques }] });

    it('is neutral when a sub-technique of an optional parent is tagged', async () => {
      // hard-t1609 shape: T1609 required; T1059 optional; model tags T1059.004.
      const result = await evaluator.evaluate(
        makeArgs(
          nestedRule([{ id: 'T1609' }, { id: 'T1059', subtechnique: [{ id: 'T1059.004' }] }]),
          {
            mitreIds: ['T1609'],
            optionalMitreIds: ['T1611', 'T1059', 'T1053'],
          }
        )
      );
      expect(result.metadata).toMatchObject({ precision: 1, recall: 1 });
      expect(result.score).toBe(1);
    });

    it('is neutral when a parent is co-tagged alongside a present optional sub', async () => {
      // gap-t1027 shape: T1027 required; T1059.001 optional; the schema cannot
      // express the sub without the parent, so the parent tag is structural.
      const result = await evaluator.evaluate(
        makeArgs(
          nestedRule([{ id: 'T1027' }, { id: 'T1059', subtechnique: [{ id: 'T1059.001' }] }]),
          { mitreIds: ['T1027'], optionalMitreIds: ['T1140', 'T1059.001'] }
        )
      );
      expect(result.score).toBe(1);
    });

    it('still penalises a wrong member of the graded family', async () => {
      // gap-t1053-005 shape: T1053.005 required; T1053 optional. A sibling
      // sub-technique (.003) is a near-miss on the technique being measured,
      // not a detail of an optional tag — it must keep its penalty.
      const result = await evaluator.evaluate(
        makeArgs(nestedRule([{ id: 'T1053', subtechnique: [{ id: 'T1053.003' }] }]), {
          mitreIds: ['T1053.005'],
          optionalMitreIds: ['T1053'],
        })
      );
      expect(result.metadata).toMatchObject({ recall: 0.5 });
      expect(result.score).toBeLessThan(1);
    });

    it('keeps the parent near-miss credit when only the parent of a required sub is tagged', async () => {
      const result = await evaluator.evaluate(
        makeArgs(nestedRule([{ id: 'T1053', subtechnique: [] }]), {
          mitreIds: ['T1053.005'],
          optionalMitreIds: ['T1053'],
        })
      );
      expect(result.metadata).toMatchObject({ precision: 0.5, recall: 0.5 });
      expect(result.score).toBe(0.5);
    });

    it('scores 0, not NaN, when only optional-family tags are present', async () => {
      const result = await evaluator.evaluate(
        makeArgs(nestedRule([{ id: 'T1059', subtechnique: [{ id: 'T1059.004' }] }]), {
          mitreIds: ['T1609'],
          optionalMitreIds: ['T1059'],
        })
      );
      expect(result.score).toBe(0);
    });
  });
});

describe('createSeverityValidityEvaluator', () => {
  const evaluator = createSeverityValidityEvaluator();

  it('scores 1 for valid severity', async () => {
    expect((await evaluator.evaluate(makeArgs(makeRule()))).score).toBe(1);
  });

  it('scores 0 for invalid severity', async () => {
    expect((await evaluator.evaluate(makeArgs(makeRule({ severity: 'urgent' })))).score).toBe(0);
  });
});

describe('createRiskScoreValidityEvaluator', () => {
  const evaluator = createRiskScoreValidityEvaluator();

  it('scores 1 for valid risk score', async () => {
    expect((await evaluator.evaluate(makeArgs(makeRule()))).score).toBe(1);
  });

  it('scores 0 for out-of-range score', async () => {
    expect((await evaluator.evaluate(makeArgs(makeRule({ risk_score: 150 })))).score).toBe(0);
  });
});

describe('createIntervalFormatEvaluator', () => {
  const evaluator = createIntervalFormatEvaluator();

  it('scores 1 for valid interval', async () => {
    expect((await evaluator.evaluate(makeArgs(makeRule({ interval: '5m' })))).score).toBe(1);
  });

  it('scores 0 for missing unit', async () => {
    expect((await evaluator.evaluate(makeArgs(makeRule({ interval: '5' })))).score).toBe(0);
  });
});

describe('createLookbackGapEvaluator', () => {
  const evaluator = createLookbackGapEvaluator();

  it('scores 1 when from covers the full interval', async () => {
    const result = await evaluator.evaluate(
      makeArgs(makeRule({ from: 'now-10m', interval: '5m' }))
    );
    expect(result.score).toBe(1);
  });

  it('scores 0 when from is more recent than interval (gap exists)', async () => {
    const result = await evaluator.evaluate(makeArgs(makeRule({ from: 'now-3m', interval: '5m' })));
    expect(result.score).toBe(0);
  });
});

describe('createFieldCoverageEvaluator', () => {
  const evaluator = createFieldCoverageEvaluator();

  it('scores 1 when all required fields are present', async () => {
    expect((await evaluator.evaluate(makeArgs(makeRule()))).score).toBe(1);
  });

  it('scores below 1 when fields are missing', async () => {
    const result = await evaluator.evaluate(makeArgs(makeRule({ name: '', description: '' })));
    expect(result.score).toBeLessThan(1);
  });
});

describe('createQueryExecutabilityEvaluator', () => {
  const makeEsClient = (response: { values?: unknown[][] } | { error: Error }): EsClient => {
    const mock = {
      esql: {
        query: jest
          .fn()
          .mockImplementation(() =>
            'error' in response ? Promise.reject(response.error) : Promise.resolve(response)
          ),
      },
    };
    return mock as unknown as EsClient;
  };

  it('returns N/A when no rule', async () => {
    const evaluator = createQueryExecutabilityEvaluator(makeEsClient({ values: [] }));
    const result = await evaluator.evaluate(noRule);
    expect(result.label).toBe('N/A');
  });

  it('scores 1 when query executes successfully', async () => {
    const evaluator = createQueryExecutabilityEvaluator(makeEsClient({ values: [[1]] }));
    const result = await evaluator.evaluate(makeArgs(makeRule()));
    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({ rowCount: 1 });
  });

  it('scores 0 when ES throws (hallucinated field)', async () => {
    const evaluator = createQueryExecutabilityEvaluator(
      makeEsClient({ error: new Error('Unknown column [fake.field]') })
    );
    const result = await evaluator.evaluate(makeArgs(makeRule()));
    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({ error: 'Unknown column [fake.field]' });
  });

  it('scores 1 for 0 rows (query ran, just no matching data)', async () => {
    const evaluator = createQueryExecutabilityEvaluator(makeEsClient({ values: [] }));
    const result = await evaluator.evaluate(makeArgs(makeRule()));
    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({ rowCount: 0 });
  });
});
