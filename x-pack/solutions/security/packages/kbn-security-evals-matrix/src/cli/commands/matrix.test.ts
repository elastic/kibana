/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { buildMatrix } from '../../matrix/build_matrix';
import { renderMatrix } from '../../matrix/render_matrix';
import {
  branchBySuiteFromColumns,
  matrixScoreQuery,
  sanitizeKbnUrlForLog,
  scoringBySuiteFromColumns,
} from './matrix';
import { parseMatrixConfig } from '../../matrix/load_matrix_config';
import type { AggregatedModelScores } from '../../matrix/query_matrix_scores';

describe('matrixScoreQuery', () => {
  const query = (overrides = {}) =>
    matrixScoreQuery(
      parseMatrixConfig({
        columns: [{ id: 'triage', label: 'Triage', suites: ['suite-a'], examplePrefixes: ['a'] }],
        models: [{ id: 'model-a', label: 'Model A' }],
        ...overrides,
      }),
      { suiteIds: ['suite-a'], modelIds: ['model-a'], asOf: undefined }
    );

  it('forwards asOf to the score query', () => {
    const asOf = Date.parse('2026-09-01T00:00:00.000Z');
    const q = matrixScoreQuery(
      parseMatrixConfig({
        columns: [{ id: 'triage', label: 'Triage', suites: ['suite-a'] }],
        models: [{ id: 'model-a', label: 'Model A' }],
      }),
      { suiteIds: ['suite-a'], modelIds: ['model-a'], asOf }
    );

    expect(q.asOf).toBe(asOf);
  });

  it('lets a column opt out of the global self-judge exclusion', () => {
    const q = query({
      scoring: { excludeSelfJudged: true },
      columns: [
        { id: 'triage', label: 'Triage', suites: ['suite-a'] },
        {
          id: 'kill-chain',
          label: 'Kill-Chain Discovery',
          suites: ['attack-discovery-agent-builder'],
          allowSelfJudged: true,
        },
      ],
    });

    expect(q.scoringBySuite?.['attack-discovery-agent-builder']?.excludeSelfJudged).toBe(false);
    // Other suites fall back to the global policy.
    expect(q.scoringBySuite?.['suite-a']).toBeUndefined();
    expect(q.scoring?.excludeSelfJudged).toBe(true);
  });

  it('forwards the opted-in scoring policy to the aggregator', () => {
    expect(query({ scoring: { useVerdictLadder: true, requireEisJudge: true } }).scoring).toEqual({
      useVerdictLadder: true,
      requireEisJudge: true,
      excludeSelfJudged: false,
    });
  });

  it('forwards no policy when the config does not opt in', () => {
    expect(query().scoring).toBeUndefined();
  });

  it('de-duplicates example prefixes across columns', () => {
    const options = query({
      columns: [
        { id: 'a', label: 'A', suites: ['s'], examplePrefixes: ['dup'] },
        { id: 'b', label: 'B', suites: ['s'], examplePrefixes: ['dup', 'other'] },
      ],
    });

    expect(options.prefixesBySuite).toEqual({ s: ['dup', 'other'] });
  });

  it('maps per-column branch overrides onto their suites', () => {
    const options = query({
      columns: [
        { id: 'persona', label: 'Persona', suites: ['persona-suite'] },
        {
          id: 'migrations',
          label: 'Migrations',
          suites: ['migrations-suite'],
          branch: 'feat/matrix-v3',
        },
      ],
    });

    expect(options.branchBySuite).toEqual({ 'migrations-suite': 'feat/matrix-v3' });
  });

  it('omits suites that do not override the branch', () => {
    expect(query().branchBySuite).toEqual({});
  });

  it('rejects conflicting branch overrides for a shared suite', () => {
    expect(() =>
      query({
        columns: [
          { id: 'a', label: 'A', suites: ['shared'], branch: 'branch-one' },
          { id: 'b', label: 'B', suites: ['shared'], branch: 'branch-two' },
        ],
      })
    ).toThrow(/Conflicting branch overrides for suite "shared"/);
  });

  it('accepts agreeing branch overrides for a shared suite', () => {
    const options = query({
      columns: [
        { id: 'a', label: 'A', suites: ['shared'], branch: 'same-branch' },
        { id: 'b', label: 'B', suites: ['shared'], branch: 'same-branch' },
      ],
    });

    expect(options.branchBySuite).toEqual({ shared: 'same-branch' });
  });
  it('rejects a conflict when a column omits `branch` and the other overrides it', () => {
    // Regression: a column without `branch` used to be skipped entirely, so its implicit
    // global-branch read never conflicted with a sibling column's explicit override.
    expect(() =>
      matrixScoreQuery(
        parseMatrixConfig({
          columns: [
            { id: 'a', label: 'A', suites: ['shared'] },
            { id: 'b', label: 'B', suites: ['shared'], branch: 'branch-two' },
          ],
          models: [{ id: 'model-a', label: 'Model A' }],
        }),
        { suiteIds: ['shared'], modelIds: ['model-a'], branch: 'main', asOf: undefined }
      )
    ).toThrow(/Conflicting branch overrides for suite \"shared\"/);
  });

  it('maps a column without `branch` onto the global branch', () => {
    const options = matrixScoreQuery(
      parseMatrixConfig({
        columns: [{ id: 'triage', label: 'Triage', suites: ['suite-a'] }],
        models: [{ id: 'model-a', label: 'Model A' }],
      }),
      { suiteIds: ['suite-a'], modelIds: ['model-a'], branch: 'main', asOf: undefined }
    );

    expect(options.branchBySuite).toEqual({ 'suite-a': 'main' });
  });
});

describe('matrix command empty-result guard', () => {
  const config = parseMatrixConfig({
    columns: [{ id: 'triage', label: 'Triage', suites: ['suite-a'], weight: 1 }],
    models: [{ id: 'model-a', label: 'Model A' }],
  });

  it('renders header-only CSVs when no experiments match', () => {
    const rendered = renderMatrix(buildMatrix([], config), config);

    expect(rendered.proprietaryCsv.trim().split('\n')).toHaveLength(1);
    expect(rendered.openSourceCsv.trim().split('\n')).toHaveLength(1);
  });

  it('renders populated CSVs when experiments do match', () => {
    const aggregated: AggregatedModelScores[] = [
      {
        modelId: 'model-a',
        provider: 'anthropic',
        suites: [
          {
            suiteId: 'suite-a',
            experimentId: 'experiment-a',
            datasets: [
              {
                datasetId: 'dataset-a-id',
                datasetName: 'dataset-a',
                evaluators: [{ evaluatorName: 'correctness', mean: 0.9, count: 10 }],
              },
            ],
          },
        ],
      },
    ];

    const rendered = renderMatrix(buildMatrix(aggregated, config), config);

    expect(rendered.proprietaryCsv.trim().split('\n').length).toBeGreaterThan(1);
  });

  it('projects a branch LIST onto every suite the column reads', () => {
    const withList = {
      ...config,
      columns: [
        {
          ...config.columns[0],
          suites: ['migrations-suite'],
          branch: ['elastic:fix/weekly-evals-matrix', 'feat/evals-extensions-matrix-v3'],
        },
      ],
    } as unknown as typeof config;

    expect(branchBySuiteFromColumns(withList)).toEqual({
      'migrations-suite': ['elastic:fix/weekly-evals-matrix', 'feat/evals-extensions-matrix-v3'],
    });
  });

  it('treats two columns declaring the same branch list as agreeing', () => {
    const shared = {
      ...config,
      columns: [
        { ...config.columns[0], suites: ['migrations-suite'], branch: ['a', 'b'] },
        { ...config.columns[0], suites: ['migrations-suite'], branch: ['a', 'b'] },
      ],
    } as unknown as typeof config;

    expect(() => branchBySuiteFromColumns(shared)).not.toThrow();
  });

  it('still rejects columns that disagree on a suite branch list', () => {
    const conflicting = {
      ...config,
      columns: [
        { ...config.columns[0], suites: ['migrations-suite'], branch: ['a', 'b'] },
        { ...config.columns[0], suites: ['migrations-suite'], branch: ['a', 'c'] },
      ],
    } as unknown as typeof config;

    expect(() => branchBySuiteFromColumns(conflicting)).toThrow(/Conflicting branch overrides/);
  });

  it('produces no model rows when no experiments match', () => {
    const matrix = buildMatrix([], config);

    expect(matrix.proprietary).toHaveLength(0);
    expect(matrix.openSource).toHaveLength(0);
  });

  it('wires both data preflights into the matrix command', () => {
    const source = readFileSync(join(__dirname, 'matrix.ts'), 'utf8');

    expect(source).toContain('warnOnConfiguredNamesMissingFromData(config, aggregated, log)');
    expect(source).toContain('warnOnDataAboutToLeaveLookback(config, aggregated, log, {');
    // The expiry preflight must see the effective CLI window, not the raw config values.
    expect(source).toMatch(/lookbackDays,\s*\n\s*\}\);/);
  });

  it('rejects columns that disagree on allowSelfJudged for a shared suite', () => {
    const conflicting = {
      ...config,
      columns: [
        { ...config.columns[0], suites: ['migrations-suite'], allowSelfJudged: true },
        { ...config.columns[0], suites: ['migrations-suite'], allowSelfJudged: false },
      ],
    } as unknown as typeof config;

    expect(() =>
      matrixScoreQuery(conflicting as unknown as Parameters<typeof matrixScoreQuery>[0], {
        suiteIds: ['migrations-suite'],
        modelIds: ['model-a'],
        asOf: undefined,
      })
    ).toThrow(/Conflicting allowSelfJudged/);
  });

  it('treats two columns agreeing on allowSelfJudged for a shared suite as consistent', () => {
    const agreeing = {
      ...config,
      columns: [
        { ...config.columns[0], suites: ['migrations-suite'], allowSelfJudged: true },
        {
          ...config.columns[0],
          id: 'col-b',
          label: 'B',
          suites: ['migrations-suite'],
          allowSelfJudged: true,
        },
      ],
    } as unknown as typeof config;

    expect(() =>
      matrixScoreQuery(agreeing as unknown as Parameters<typeof matrixScoreQuery>[0], {
        suiteIds: ['migrations-suite'],
        modelIds: ['model-a'],
        asOf: undefined,
      })
    ).not.toThrow();
  });
});

describe('sanitizeKbnUrlForLog', () => {
  it('strips userinfo, query, and fragment before logging a Kibana URL', () => {
    expect(
      sanitizeKbnUrlForLog('https://user:s3cret@kibana.example.com:5601/app?token=abc#frag')
    ).toBe('https://kibana.example.com:5601/app');
  });

  it('falls back to a placeholder for an unparseable URL rather than logging it raw', () => {
    expect(sanitizeKbnUrlForLog('not a url')).toBe('<unparseable-url>');
  });
});

describe('scoringBySuiteFromColumns', () => {
  const config = (overrides = {}) =>
    parseMatrixConfig({
      columns: [{ id: 'triage', label: 'Triage', suites: ['suite-a'] }],
      models: [{ id: 'model-a', label: 'Model A' }],
      ...overrides,
    });

  it('treats a column that omits allowSelfJudged as running under the global policy', () => {
    // Regression: those columns were filtered out before the comparison, so an explicit
    // override on a sibling column on the same suite was silently applied to them too.
    expect(() =>
      scoringBySuiteFromColumns(
        config({
          scoring: { excludeSelfJudged: true },
          columns: [
            { id: 'triage', label: 'Triage', suites: ['suite-a'] },
            { id: 'detect', label: 'Detect', suites: ['suite-a'], allowSelfJudged: true },
          ],
        })
      )
    ).toThrow(/Conflicting allowSelfJudged settings for suite "suite-a"/);
  });

  it('accepts an inherited policy that agrees with the explicit override', () => {
    const bySuite = scoringBySuiteFromColumns(
      config({
        scoring: { excludeSelfJudged: false },
        columns: [
          { id: 'triage', label: 'Triage', suites: ['suite-a'] },
          { id: 'detect', label: 'Detect', suites: ['suite-a'], allowSelfJudged: true },
        ],
      })
    );

    expect(bySuite['suite-a'].excludeSelfJudged).toBe(false);
  });

  it('only emits an override for suites a column configures explicitly', () => {
    // An inheriting column must not write a synthetic entry: the global default is applied on
    // fetch anyway, and synthesising one would freeze today's default into the query options.
    const bySuite = scoringBySuiteFromColumns(
      config({
        scoring: { excludeSelfJudged: true },
        columns: [
          { id: 'triage', label: 'Triage', suites: ['suite-a'] },
          { id: 'detect', label: 'Detect', suites: ['suite-b'], allowSelfJudged: true },
        ],
      })
    );

    expect(Object.keys(bySuite)).toEqual(['suite-b']);
    expect(bySuite['suite-b'].excludeSelfJudged).toBe(false);
  });
});
