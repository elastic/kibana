/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  parseMatrixConfig,
  DEFAULT_EXCLUDED_EVALUATORS,
  applyModelOverrides,
  parseModelOverride,
} from './load_matrix_config';

describe('parseMatrixConfig', () => {
  const minimalConfig = {
    columns: [{ id: 'alert_triage', label: 'Alert Triage', suites: ['security-alert-triage'] }],
    models: [{ id: 'eis/foo', label: 'Foo' }],
  };

  it('rejects a column id containing a colon', () => {
    expect(() =>
      parseMatrixConfig({
        ...minimalConfig,
        columns: [{ id: 'alert:triage', label: 'Alert Triage', suites: ['s'] }],
      })
    ).toThrow(/must not contain ':'/);
  });

  it('rejects a model id containing a colon', () => {
    expect(() =>
      parseMatrixConfig({ ...minimalConfig, models: [{ id: 'eis:foo', label: 'Foo' }] })
    ).toThrow(/must not contain ':'/);
  });

  it('rejects duplicate column ids (a duplicate would double-count toward coverage and Overall)', () => {
    expect(() =>
      parseMatrixConfig({
        ...minimalConfig,
        columns: [
          { id: 'alert_triage', label: 'Alert Triage', suites: ['s1'] },
          { id: 'alert_triage', label: 'Alert Triage Again', suites: ['s2'] },
        ],
      })
    ).toThrow(/Duplicate column id "alert_triage"/);
  });

  it('rejects duplicate composite ids', () => {
    expect(() =>
      parseMatrixConfig({
        ...minimalConfig,
        composites: [
          { id: 'combined', label: 'Combined', from: ['alert_triage'] },
          { id: 'combined', label: 'Combined Again', from: ['alert_triage'] },
        ],
      })
    ).toThrow(/Duplicate composite id "combined"/);
  });

  it('rejects a composite id that collides with a base column id', () => {
    expect(() =>
      parseMatrixConfig({
        ...minimalConfig,
        composites: [{ id: 'alert_triage', label: 'Collides', from: ['alert_triage'] }],
      })
    ).toThrow(/collides with a base column id/);
  });

  it('rejects duplicate model ids', () => {
    expect(() =>
      parseMatrixConfig({
        ...minimalConfig,
        models: [
          { id: 'eis/foo', label: 'Foo' },
          { id: 'eis/foo', label: 'Foo Again' },
        ],
      })
    ).toThrow(/Duplicate model id "eis\/foo"/);
  });

  it('bounds the column-level branch array (CodeQL: unbounded schema.arrayOf is a DoS vector)', () => {
    expect(() =>
      parseMatrixConfig({
        ...minimalConfig,
        columns: [
          {
            id: 'alert_triage',
            label: 'Alert Triage',
            suites: ['s'],
            branch: Array.from({ length: 1001 }, (_, i) => `branch-${i}`),
          },
        ],
      })
    ).toThrow(/array size is \[1001\], but cannot be greater than \[1000\]/);
  });

  it('rejects requireEisJudge/useVerdictLadder on a suite with no examplePrefixes column', () => {
    expect(() =>
      parseMatrixConfig({
        ...minimalConfig,
        scoring: { requireEisJudge: true },
      })
    ).toThrow(/no column declaring "examplePrefixes"/);

    expect(() =>
      parseMatrixConfig({
        ...minimalConfig,
        scoring: { useVerdictLadder: true },
      })
    ).toThrow(/no column declaring "examplePrefixes"/);
  });

  it('accepts requireEisJudge/useVerdictLadder when every suite has an examplePrefixes column', () => {
    const config = parseMatrixConfig({
      ...minimalConfig,
      columns: [
        {
          id: 'alert_triage',
          label: 'Alert Triage',
          suites: ['security-alert-triage'],
          examplePrefixes: ['alert-analysis'],
        },
      ],
      scoring: { requireEisJudge: true, useVerdictLadder: true },
    });
    expect(config.scoring?.requireEisJudge).toBe(true);
  });

  it('does NOT require examplePrefixes for excludeSelfJudged (separately enforced pre-aggregation)', () => {
    expect(() =>
      parseMatrixConfig({
        ...minimalConfig,
        scoring: { excludeSelfJudged: true },
      })
    ).not.toThrow();
  });

  it('applies defaults for optional fields', () => {
    const config = parseMatrixConfig(minimalConfig);

    expect(config.branch).toBe('main');
    expect(config.defaultScale).toBe(10);
    expect(config.decimals).toBe(2);
    expect(config.notRecommendedBelow).toBe(0);
    expect(config.notRecommendedLabel).toBe('Not recommended');
    expect(config.notRecommendedCountsAsZeroInOverall).toBe(true);
    expect(config.overall).toEqual({
      label: 'Overall',
      mode: 'weighted',
      excludeSaturatedEvaluators: false,
    });
    expect(config.showOverall).toBe(true);
    expect(config.composites).toEqual([]);
    expect(config.layout).toBeUndefined();
    expect(config.columns[0].weight).toBe(1);
    expect(config.columns[0].group).toBeUndefined();
    expect(config.models[0].openSource).toBe(false);
    expect(config.excludeEvaluators).toEqual([...DEFAULT_EXCLUDED_EVALUATORS]);
  });

  it('accepts grouped columns, composites, a layout, and showOverall', () => {
    const config = parseMatrixConfig({
      ...minimalConfig,
      showOverall: false,
      columns: [
        { id: 'a', label: 'A', group: 'Agent Builder', suites: ['s-a'] },
        { id: 'b', label: 'B', group: 'Agent Builder', suites: ['s-b'] },
      ],
      composites: [{ id: 'ab', label: 'AB Score', from: ['a', 'b'] }],
      layout: ['a', 'b', 'ab'],
    });

    expect(config.showOverall).toBe(false);
    expect(config.columns[0].group).toBe('Agent Builder');
    expect(config.composites).toEqual([{ id: 'ab', label: 'AB Score', from: ['a', 'b'] }]);
    expect(config.layout).toEqual(['a', 'b', 'ab']);
  });

  it('throws when a composite has no source columns', () => {
    expect(() =>
      parseMatrixConfig({
        ...minimalConfig,
        composites: [{ id: 'ab', label: 'AB', from: [] }],
      })
    ).toThrow();
  });

  it('throws when a composite references an unknown source', () => {
    expect(() =>
      parseMatrixConfig({
        ...minimalConfig,
        composites: [{ id: 'ab', label: 'AB', from: ['nope'] }],
      })
    ).toThrow(/references unknown or not-yet-defined source \"nope\"/);
  });

  it('throws when a composite forward-references a later composite', () => {
    // `computeComposite` fills `cells` in declaration order, so a later id is not resolvable.
    expect(() =>
      parseMatrixConfig({
        ...minimalConfig,
        composites: [
          { id: 'first', label: 'First', from: ['second'] },
          { id: 'second', label: 'Second', from: ['alert_triage'] },
        ],
      })
    ).toThrow(/references unknown or not-yet-defined source \"second\"/);
  });

  it('throws when a model id is reused as another model matchId alias', () => {
    // Model identity spans `id` and `matchIds`; a shared identifier merges two rows' scores.
    expect(() =>
      parseMatrixConfig({
        ...minimalConfig,
        models: [
          { id: 'eis/foo', label: 'Foo' },
          { id: 'eis/bar', label: 'Bar', matchIds: ['eis/foo'] },
        ],
      })
    ).toThrow(/is used by more than one model row/);
  });

  it('throws when two models share a matchId alias', () => {
    expect(() =>
      parseMatrixConfig({
        ...minimalConfig,
        models: [
          { id: 'eis/foo', label: 'Foo', matchIds: ['alias'] },
          { id: 'eis/bar', label: 'Bar', matchIds: ['alias'] },
        ],
      })
    ).toThrow(/is used by more than one model row/);
  });

  it('allows overriding the evaluator exclusion list (including emptying it)', () => {
    expect(
      parseMatrixConfig({ ...minimalConfig, excludeEvaluators: [] }).excludeEvaluators
    ).toEqual([]);
    expect(
      parseMatrixConfig({ ...minimalConfig, excludeEvaluators: ['Latency'] }).excludeEvaluators
    ).toEqual(['Latency']);
  });

  it('throws when a column has no suites', () => {
    expect(() =>
      parseMatrixConfig({
        ...minimalConfig,
        columns: [{ id: 'x', label: 'X', suites: [] }],
      })
    ).toThrow();
  });

  it('throws when there are no columns or models', () => {
    expect(() => parseMatrixConfig({ columns: [], models: [] })).toThrow();
  });

  it('rejects an invalid overall mode', () => {
    expect(() => parseMatrixConfig({ ...minimalConfig, overall: { mode: 'nope' } })).toThrow();
  });
});

describe('applyModelOverrides', () => {
  const base = parseMatrixConfig({
    title: 'Weekly',
    columns: [{ id: 'triage', label: 'Triage', suites: ['suite-a'], weight: 1 }],
    models: [
      { id: 'weekly-1', label: 'Weekly One' },
      { id: 'weekly-2', label: 'Weekly Two' },
    ],
  });

  it('returns the config untouched when no overrides are given', () => {
    expect(applyModelOverrides(base, [])).toBe(base);
  });

  it('replaces rather than appends, so an on-demand run shows only what was asked for', () => {
    const result = applyModelOverrides(base, ['custom-a']);
    expect(result.models).toEqual([{ id: 'custom-a', label: 'custom-a', openSource: false }]);
  });

  it('does not mutate the weekly config', () => {
    applyModelOverrides(base, ['custom-a']);
    expect(base.models.map((m) => m.id)).toEqual(['weekly-1', 'weekly-2']);
  });

  it('parses label and explicit open-source marker', () => {
    expect(applyModelOverrides(base, ['qwen3-72b:Qwen3 72B:open-source']).models[0]).toEqual({
      id: 'qwen3-72b',
      label: 'Qwen3 72B',
      openSource: true,
    });
  });

  it('defaults the label to the id and openSource to false', () => {
    expect(parseModelOverride('gpt-5')).toEqual({
      id: 'gpt-5',
      label: 'gpt-5',
      openSource: false,
    });
  });

  it('rejects a bogus third segment instead of silently treating it as proprietary', () => {
    expect(() => parseModelOverride('gpt-5:GPT-5:oss')).toThrow(/literal "open-source"/);
  });

  it('rejects too many segments', () => {
    expect(() => parseModelOverride('a:b:open-source:c')).toThrow(/at most 3/);
  });

  it('rejects an empty id', () => {
    expect(() => parseModelOverride(':Label')).toThrow(/model id is required/);
  });

  it('rejects duplicate ids', () => {
    expect(() => applyModelOverrides(base, ['dup', 'dup:Other'])).toThrow(/Duplicate --model id/);
  });
});

describe('round 6 regression: matchIds must be colon-free like ids', () => {
  it('rejects a matchIds entry containing a colon', () => {
    expect(() =>
      parseMatrixConfig({
        columns: [{ id: 'alert_triage', label: 'Alert Triage', suites: ['s'] }],
        models: [{ id: 'eis/foo', label: 'Foo', matchIds: ['provider/alias:evil'] }],
      })
    ).toThrow(/must not contain ':'/);
  });
});
