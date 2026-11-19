/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Matrix } from './build_matrix';
import { renderReliabilityHtml } from './render_reliability_html';
import { cellAgreement, MIN_RELIABILITY_REPETITIONS } from './trajectory_agreement';

const matrix: Matrix = {
  columns: [],
  composites: [],
  displayColumns: [],
  overallLabel: 'Overall',
  evaluatorSaturation: [],
  proprietary: [
    {
      modelId: 'measured',
      modelLabel: 'Measured',
      openSource: false,
      cells: {},
      overall: { kind: 'score', value: 8 },
      capability: { kind: 'score', value: 9 },
      judgedQuality: { kind: 'score', value: 7 },
      coverage: { covered: 8, total: 8 },
      tier: 1,
    },
    {
      modelId: 'single',
      modelLabel: 'Single run',
      openSource: false,
      cells: {},
      overall: { kind: 'score', value: 7 },
      capability: { kind: 'score', value: 6 },
      judgedQuality: { kind: 'score', value: 8 },
      coverage: { covered: 8, total: 8 },
      tier: 1,
    },
  ],
  openSource: [],
};

describe('renderReliabilityHtml', () => {
  it('discloses self-judged provenance on axis cells', () => {
    // Regression: the reliability axes published allowed self-judged averages with no
    // marker, reading as independently judged evidence.
    const flagged: Matrix = {
      ...matrix,
      proprietary: [
        {
          ...matrix.proprietary[0],
          capability: { kind: 'score', value: 9, selfJudged: true },
          judgedQuality: { kind: 'score', value: 7 },
        },
      ],
    };
    const html = renderReliabilityHtml(flagged, {});
    expect(html).toContain('9.00 (self-judged)');
    expect(html).not.toContain('7.00 (self-judged)');
  });

  it('renders a separate reliability artifact without treating unmeasured as zero', () => {
    const html = renderReliabilityHtml(matrix, {
      'measured:example-a': { repTrails: [['search'], ['search']] },
      'measured:example-b': { repTrails: [['search'], ['load_skill']] },
      'single:example-a': { repTrails: [['search']] },
    });
    expect(html).toContain('Capability · Reliability · Judged quality');
    expect(html).toContain('<strong>50%</strong>');
    expect(html).toContain('9.00');
    expect(html).toContain('7.00');
    expect(html).toContain('Unmeasured');
    expect(html).not.toContain('Unmeasured</span><small>0');
  });

  it('excludes probe examples from the identical-path rate', () => {
    const html = renderReliabilityHtml(matrix, {
      'measured:alert-analysis-a': { repTrails: [['search'], ['load_skill']] },
      'measured:workflow-authoring-a': { repTrails: [['search'], ['search']] },
    });
    expect(html).toContain('<strong>100%</strong>');
    expect(html).not.toContain('<strong>50%</strong>');
  });

  it('reports the pair count and interval instead of a bare rate', () => {
    const html = renderReliabilityHtml(matrix, {
      'measured:example-a': { repTrails: [['search'], ['search']] },
      'measured:example-b': { repTrails: [['search'], ['load_skill']] },
    });
    expect(html).toContain('2 pairs');
    expect(html).toMatch(/\(\d+%–\d+%\)/);
  });

  it('marks measured rows as tied when their intervals overlap', () => {
    const html = renderReliabilityHtml(matrix, {
      'measured:example-a': { repTrails: [['search'], ['search']] },
      'measured:example-b': { repTrails: [['search'], ['load_skill']] },
      'single:example-a': { repTrails: [['search'], ['search']] },
      'single:example-b': { repTrails: [['search'], ['load_skill']] },
    });
    expect(html).toContain('statistically tied');
  });

  it('prefers the declared path contract over the legacy prefix guess', () => {
    const html = renderReliabilityHtml(matrix, {
      'measured:alert-analysis-a': {
        repTrails: [['search'], ['load_skill']],
        pathContract: 'rankable',
      },
    });
    expect(html).toContain('<strong>0%</strong>');
    expect(html).not.toContain('legacy example-prefix list');
  });

  it('discloses legacy classification for corpora predating pathContract', () => {
    const html = renderReliabilityHtml(matrix, {
      'measured:workflow-authoring-a': { repTrails: [['search'], ['search']] },
    });
    expect(html).toContain('legacy example-prefix list');
  });

  it('reports answer similarity separately from path agreement', () => {
    const answer = 'the host was compromised via a scheduled task '.repeat(3);
    const html = renderReliabilityHtml(matrix, {
      'measured:example-a': {
        repTrails: [['search'], ['search']],
        repAnswers: [answer, 'a completely different conclusion entirely here now'],
      },
    });
    expect(html).toContain('<strong>100%</strong>');
    expect(html).toContain('answer similarity');
  });

  it('says what an unmeasured row needs instead of leaving it blank', () => {
    const html = renderReliabilityHtml(matrix, {
      'measured:example-a': { repTrails: [['search'], ['search']] },
    });
    // Asserted through the constant so the copy cannot drift from `cellAgreement`'s floor.
    expect(html).toContain(`needs k&ge;${MIN_RELIABILITY_REPETITIONS}`);
  });

  it('reports exactly the repetition floor the code enforces', () => {
    // The floor is interpolated from the constant, so the rendered claim and `cellAgreement`
    // are the same number by construction: one fewer repeat stays unmeasured, the floor measures.
    const below = cellAgreement(
      Array.from({ length: MIN_RELIABILITY_REPETITIONS - 1 }, () => ['a'])
    );
    const atFloor = cellAgreement(Array.from({ length: MIN_RELIABILITY_REPETITIONS }, () => ['a']));
    expect(below.status).toBe('unmeasured');
    expect(atFloor.status).toBe('measured');
  });

  it('discloses a dirty working tree in provenance', () => {
    const html = renderReliabilityHtml(
      matrix,
      { 'measured:example-a': { repTrails: [['search'], ['search']] } },
      { commitSha: 'abc123', dirtyWorkingTree: true }
    );
    expect(html).toContain('uncommitted changes present');
  });

  // Regression (round-7): the provenance line omitted the effective lookback and asOf
  // cutoff, so a historical artifact could be mistaken for a current-window report.
  it('discloses the lookback window and asOf cutoff in provenance', () => {
    const html = renderReliabilityHtml(
      matrix,
      {},
      { lookbackDays: 30, asOf: Date.UTC(2026, 8, 23) }
    );
    expect(html).toContain('30-day lookback');
    expect(html).toContain('as of 2026-09-23 (later runs excluded)');
  });

  // Regression (round-7): direct trace keys are suite-scoped; two suites reusing an
  // example ID must yield two cells for the right model, not one garbled cell.
  it('parses suite-scoped direct trace keys into model and example', () => {
    const html = renderReliabilityHtml(matrix, {
      'measured:direct:s1:example-a': { repTrails: [['search'], ['search']] },
      'measured:direct:s2:example-a': { repTrails: [['search'], ['search']] },
      'measured:direct:s1:example-b': { repTrails: [['search'], ['load_skill']] },
    });
    // Pooled across 3 cells (example-a twice via s1/s2, example-b once): 2 of 3 pairs identical.
    expect(html).toContain('<strong>67%</strong>');
    expect(html).toContain('3 pairs');
  });

  describe('judge agreement column', () => {
    const verdict = (
      modelId: string,
      judgeId: string,
      example: string,
      evaluator: string,
      score: number
    ) => ({ modelId, judgeId, example, repetition: 0, evaluator, score });

    it('renders Unmeasured when no judge verdicts are supplied', () => {
      const html = renderReliabilityHtml(matrix, {}, {});
      expect(html).toContain('Judge agreement');
      expect(html).toContain('no verdicts');
    });

    it('renders Single judge, never a percentage, for one-judge models', () => {
      const html = renderReliabilityHtml(matrix, {}, {}, [
        verdict('measured', 'gemini', 'ex-1', 'Relevance', 1),
        verdict('measured', 'gemini', 'ex-2', 'Relevance', 1),
      ]);
      expect(html).toContain('Single judge');
      expect(html).toContain('no second opinion');
      expect(html).not.toContain('100.0%');
    });

    it('renders agreement with its interval and pair count', () => {
      const html = renderReliabilityHtml(matrix, {}, {}, [
        verdict('measured', 'gemini', 'ex-1', 'Relevance', 1),
        verdict('measured', 'sonnet', 'ex-1', 'Relevance', 1),
        verdict('measured', 'gemini', 'ex-2', 'Relevance', 1),
        verdict('measured', 'sonnet', 'ex-2', 'Relevance', 0),
      ]);
      expect(html).toContain('50.0%');
      expect(html).toContain('2 paired verdicts');
      expect(html).toContain('95% CI');
    });

    it('names the worst evaluator with its flip interval', () => {
      const html = renderReliabilityHtml(matrix, {}, {}, [
        verdict('measured', 'gemini', 'ex-1', 'Relevance', 1),
        verdict('measured', 'sonnet', 'ex-1', 'Relevance', 0),
      ]);
      expect(html).toContain('worst:');
      expect(html).toContain('Relevance');
    });

    it('states that agreement is not correctness', () => {
      const html = renderReliabilityHtml(matrix, {}, {}, [
        verdict('measured', 'gemini', 'ex-1', 'Relevance', 1),
        verdict('measured', 'sonnet', 'ex-1', 'Relevance', 1),
      ]);
      expect(html).toContain('both judges can agree and both be wrong');
    });
  });

  describe('round-3 regression: reliability inputs scoped to columns', () => {
    // Minimal config: one column reading only suite-a's `alert` prefix.
    const scopedConfig = {
      columns: [
        {
          id: 'alert',
          label: 'Alert',
          suites: ['suite-a'],
          examplePrefixes: ['alert'],
          weight: 1,
        },
      ],
    } as never;

    it('excludes traces whose example prefix no column reads', () => {
      // Regression: the reliability artifact pooled EVERY trace from a selected suite,
      // so unrelated `hunting` examples inflated trajectory agreement even though only
      // the `alert` prefix contributed to the published matrix.
      const html = renderReliabilityHtml(
        matrix,
        {
          'measured:direct:suite-a:alert-x': { repTrails: [['a'], ['a']] },
          // Out-of-scope prefix: disagreeing trails that would drag the rate to 50%.
          'measured:direct:suite-a:hunting-x': { repTrails: [['a'], ['b']] },
        },
        {},
        [],
        scopedConfig
      );
      // Only the alert cell counts: 1/1 identical -> 100%, 1 pair.
      expect(html).toContain('<strong>100%</strong>');
      expect(html).toContain('1 pairs');
      expect(html).not.toContain('<strong>50%</strong>');
    });

    it('excludes judge verdicts from examples no column reads', () => {
      const v = (
        judgeId: string,
        example: string,
        score: number,
        suiteId = 'suite-a'
      ): {
        modelId: string;
        judgeId: string;
        suiteId: string;
        example: string;
        repetition: number;
        evaluator: string;
        score: number;
      } => ({
        modelId: 'measured',
        judgeId,
        suiteId,
        example,
        repetition: 0,
        evaluator: 'Relevance',
        score,
      });
      const html = renderReliabilityHtml(
        matrix,
        {},
        {},
        [
          // In-scope pair: agrees.
          v('gemini', 'alert-1', 1),
          v('sonnet', 'alert-1', 1),
          // Out-of-scope pair: disagrees — must not drag agreement below 100%.
          v('gemini', 'hunting-1', 1),
          v('sonnet', 'hunting-1', 0),
        ],
        scopedConfig
      );
      expect(html).toContain('100.0%');
      expect(html).toContain('1 paired verdict');
      expect(html).not.toContain('50.0%');
    });

    it('keeps traces without a parseable direct key unscoped (legacy shape)', () => {
      const html = renderReliabilityHtml(
        matrix,
        { 'measured:example-a': { repTrails: [['search'], ['search']] } },
        {},
        [],
        scopedConfig
      );
      expect(html).toContain('<strong>100%</strong>');
    });

    it('rejects a same-prefix sibling example the score query would also reject (Libra round-53896)', () => {
      // The score query buckets by `exampleId === prefix || exampleId.startsWith(prefix + '-')`
      // (see scoresByPrefixToDatasets). A loose `startsWith(prefix)` check here let
      // `alertx-1` (no dash boundary) pass as in-scope even though it never contributed to
      // the published matrix score — inflating reliability with data the score never used.
      const v = (
        judgeId: string,
        example: string,
        score: number
      ): {
        modelId: string;
        judgeId: string;
        suiteId: string;
        example: string;
        repetition: number;
        evaluator: string;
        score: number;
      } => ({
        modelId: 'measured',
        judgeId,
        suiteId: 'suite-a',
        example,
        repetition: 0,
        evaluator: 'Relevance',
        score,
      });
      const html = renderReliabilityHtml(
        matrix,
        {
          // In-scope trace: exact prefix match.
          'measured:direct:suite-a:alert': { repTrails: [['a'], ['a']] },
          // Out of scope: 'alertx' shares the 'alert' prefix by startsWith() but is a
          // different, non-dash-delimited example id the score query would reject.
          'measured:direct:suite-a:alertx': { repTrails: [['a'], ['b']] },
        },
        {},
        [
          v('gemini', 'alert', 1),
          v('sonnet', 'alert', 1),
          v('gemini', 'alertx', 1),
          v('sonnet', 'alertx', 0),
        ],
        scopedConfig
      );
      // Only the exact-prefix trace/verdict pair counts; the 'alertx' sibling must not
      // drag either rate down from 100%.
      expect(html).toContain('<strong>100%</strong>');
      expect(html).not.toContain('<strong>50%</strong>');
      expect(html).toContain('100.0%');
      expect(html).not.toContain('50.0%');
    });
  });

  describe('datasetIds-scoped judge verdicts (Libra round-53896)', () => {
    // A `datasetIds` column (no examplePrefixes) can only be matched by a verdict's own
    // dataset id — there is no prefix fallback for this shape.
    const datasetScopedConfig = {
      columns: [
        {
          id: 'persona',
          label: 'Persona',
          suites: ['suite-a'],
          datasetIds: ['ds-selected'],
          weight: 1,
        },
      ],
    } as never;

    const v = (
      judgeId: string,
      datasetId: string | undefined,
      example: string,
      score: number
    ): {
      modelId: string;
      judgeId: string;
      suiteId: string;
      datasetId?: string;
      example: string;
      repetition: number;
      evaluator: string;
      score: number;
    } => ({
      modelId: 'measured',
      judgeId,
      suiteId: 'suite-a',
      ...(datasetId !== undefined ? { datasetId } : {}),
      example,
      repetition: 0,
      evaluator: 'Relevance',
      score,
    });

    it('measures agreement when the verdict carries the selected dataset id', () => {
      const html = renderReliabilityHtml(
        matrix,
        {},
        {},
        [v('gemini', 'ds-selected', 'ex-1', 1), v('sonnet', 'ds-selected', 'ex-1', 1)],
        datasetScopedConfig
      );
      // Pre-fix, `isColumnScoped(v.suiteId, undefined, v.example)` was called with a
      // hardcoded `undefined` dataset id regardless of what the verdict carried, so a
      // `datasetIds` column's allowlist check could never be satisfied and this always
      // read 'no verdicts'/unmeasured even though both judges scored a selected dataset.
      expect(html).toContain('100.0%');
      expect(html).toContain('1 paired verdicts');
    });

    it('still excludes a verdict from an unselected dataset', () => {
      const html = renderReliabilityHtml(
        matrix,
        {},
        {},
        [
          v('gemini', 'ds-selected', 'ex-1', 1),
          v('sonnet', 'ds-selected', 'ex-1', 1),
          v('gemini', 'ds-other', 'ex-2', 1),
          v('sonnet', 'ds-other', 'ex-2', 0),
        ],
        datasetScopedConfig
      );
      // The unselected-dataset pair disagrees; if it leaked in, agreement would drop to 50%.
      expect(html).toContain('100.0%');
      expect(html).not.toContain('50.0%');
    });
  });
});
