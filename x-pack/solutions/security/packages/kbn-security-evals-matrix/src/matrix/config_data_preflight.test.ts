/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { parseMatrixConfig } from './load_matrix_config';
import type { AggregatedModelScores } from './query_matrix_scores';
import { warnOnDataAboutToLeaveLookback } from './config_data_preflight';

const collectWarnings = () => {
  const warnings: string[] = [];
  const log = {
    warning: (msg: string) => warnings.push(String(msg)),
    info: () => {},
    debug: () => {},
  } as unknown as ToolingLog;
  return { warnings, log };
};

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-09-02T00:00:00.000Z');

const config = parseMatrixConfig({
  lookbackDays: 45,
  columns: [
    {
      id: 'migrations-rules',
      label: 'Rule Translation',
      suites: ['security-automatic-migrations'],
    },
    { id: 'triage', label: 'Triage', suites: ['persona-matrix'] },
  ],
  models: [{ id: 'model-a', label: 'A' }],
});

const scores = (suiteId: string, ageDays: number): AggregatedModelScores[] => [
  {
    modelId: 'model-a',
    provider: 'p',
    suites: [
      {
        suiteId,
        experimentId: 'e1',
        timestamp: new Date(NOW - ageDays * DAY).toISOString(),
        datasets: [
          {
            datasetId: 'd',
            datasetName: 'd',
            evaluators: [{ evaluatorName: 'Rubric', mean: 0.8, count: 10 }],
          },
        ],
      },
    ],
  },
];

describe('warnOnDataAboutToLeaveLookback', () => {
  it('warns when a suite is inside the window but close to falling out', () => {
    const { warnings, log } = collectWarnings();

    warnOnDataAboutToLeaveLookback(config, scores('security-automatic-migrations', 34), log, {
      now: NOW,
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('security-automatic-migrations');
    expect(warnings[0]).toContain('11 day');
  });

  it('stays silent for data with comfortable headroom', () => {
    const { warnings, log } = collectWarnings();

    warnOnDataAboutToLeaveLookback(config, scores('persona-matrix', 3), log, { now: NOW });

    expect(warnings).toEqual([]);
  });

  it('does not warn about data that already left the window', () => {
    const { warnings, log } = collectWarnings();

    warnOnDataAboutToLeaveLookback(config, scores('security-automatic-migrations', 60), log, {
      now: NOW,
    });

    expect(warnings).toEqual([]);
  });

  it('warns against the effective lookback override, not the config value', () => {
    const { warnings, log } = collectWarnings();

    // Config lookback is 45d; the effective window passed on the CLI is 30d,
    // so 34-day-old data has already left the actual query window (no warning)
    // while 20-day-old data is inside it and 10 days from falling out (warns).
    const gone = collectWarnings();
    warnOnDataAboutToLeaveLookback(config, scores('security-automatic-migrations', 34), gone.log, {
      now: NOW,
      lookbackDays: 30,
    });
    expect(gone.warnings).toEqual([]);

    warnOnDataAboutToLeaveLookback(config, scores('persona-matrix', 20), log, {
      now: NOW,
      lookbackDays: 30,
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('persona-matrix');
    expect(warnings[0]).toContain('10 day');
  });
});
