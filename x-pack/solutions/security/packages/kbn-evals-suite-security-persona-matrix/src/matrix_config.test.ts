/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { parseMatrixConfig } from '@kbn/security-evals-matrix';
import { AD_FAILURE_CLASS_EVALUATOR_NAME } from './evaluators/ad_failure_class_evaluator';
import {
  PERSONA_MATRIX_SUITE_IDS,
  resolveAgentProfile,
  resolveSuiteProfileEnv,
} from './agent_profile';
import { reportingIdentity } from './evaluate_dataset';
import { CHAIN_COVERAGE_EVALUATOR_NAME } from './evaluators/chain_coverage_evaluator';
import { EICAR_TRAP_EVALUATOR_NAME } from './evaluators/eicar_trap_evaluator';
import { RUBRIC_CAP_NO_TOOL_CALL_EVALUATOR_NAME } from './evaluators/rubric_cap_no_tool_call_evaluator';
import { SIMULATION_AWARENESS_EVALUATOR_NAME } from './evaluators/simulation_awareness_evaluator';
import { STALLED_AFTER_LOAD_SKILL_EVALUATOR_NAME } from './evaluators/stalled_after_load_skill_evaluator';
import { UNREQUESTED_SIDE_EFFECTS_EVALUATOR_NAME } from './evaluators/unrequested_side_effects_evaluator';
import { WORKFLOW_VALIDITY_EVALUATOR_NAME } from './evaluators/workflow_validity_evaluator';
import config from '../persona_matrix.config.json';
import productionConfig from '../persona_matrix.production.config.json';
import parityConfig from '../persona_matrix.parity.config.json';
import suitesMetadata from '../../../../../../.buildkite/pipelines/evals/evals.suites.json';

/**
 * The shipped persona matrix config, not a fixture.
 *
 * The scoring policy decides whether a published cell can be reproduced, so a
 * silent drop of this block during an edit has to fail the build rather than
 * quietly restore the old scoring basis.
 */
describe('persona_matrix.config.json scoring policy', () => {
  it('scores judged evaluators by verdict and admits only reproducible judges', () => {
    expect(config.scoring).toEqual({
      useVerdictLadder: true,
      requireEisJudge: true,
      excludeSelfJudged: true,
    });
  });

  it('warns that these numbers are not comparable to older matrices', () => {
    const notes: string[] = config.provenance?.methodologyNotes ?? [];

    expect(notes.some((note) => note.includes('NOT comparable'))).toBe(true);
    expect(notes.some((note) => note.includes('verdict'))).toBe(true);
  });
});

/**
 * Importing the JSON proves nothing about whether `matrix --config` / `rejudge --config`
 * accept it: the loader rejects, for example, `requireEisJudge` / `useVerdictLadder` on a suite
 * whose columns declare no `examplePrefixes`. Both shipped configs go through the real loader.
 */
describe.each([
  ['persona_matrix.config.json', config],
  ['persona_matrix.production.config.json', productionConfig],
  ['persona_matrix.parity.config.json', parityConfig],
])('%s through the matrix config loader', (_name, raw) => {
  it('passes parseMatrixConfig', () => {
    expect(() => parseMatrixConfig(raw)).not.toThrow();
  });

  it('declares examplePrefixes for every column so the scoring policy applies per document', () => {
    const missing = raw.columns
      .filter((column) => !('examplePrefixes' in column) || !column.examplePrefixes?.length)
      .map((column) => column.id);

    expect(missing).toEqual([]);
  });
});

/**
 * A column whose `suites` entry does not match a registered eval suite id still
 * renders — it just comes back permanently blank, because the matrix queries
 * `listExperiments({ suiteId })` and silently gets nothing. That failure is
 * invisible in a generated matrix (an empty cell looks like "not run yet"), so
 * the wiring is asserted here instead.
 */
describe('persona_matrix.config.json column wiring', () => {
  const registeredSuiteIds: string[] = suitesMetadata.suites.map((suite) => suite.id);

  it('references only suite ids that are registered in evals.suites.json', () => {
    const referenced = [...new Set(config.columns.flatMap((column) => column.suites))];
    const unknown = referenced.filter((suiteId) => !registeredSuiteIds.includes(suiteId));

    expect(unknown).toEqual([]);
  });

  it('covers attack discovery and automatic migrations alongside the persona prompts', () => {
    const suitesByColumn = new Map(config.columns.map((column) => [column.id, column.suites]));

    // The live suite is attack-discovery-agent-builder: the legacy attack-discovery
    // id still has docs but only ~2 per evaluator, which published a near-zero
    // score for models that actually pass it 1.0 on the real suite.
    expect(suitesByColumn.get('attack-discovery')).toEqual(['attack-discovery-agent-builder']);
    expect(suitesByColumn.get('migrations-rules')).toEqual(['security-automatic-migrations']);
    expect(suitesByColumn.get('migrations-dashboards')).toEqual(['security-automatic-migrations']);
  });

  it('gives every column a unique id so cells cannot overwrite each other', () => {
    const ids = config.columns.map((column) => column.id);

    expect(ids).toHaveLength(new Set(ids).size);
  });
});

/**
 * The extra suites do not run on the same branch as the persona prompts: attack
 * discovery's weekly job lives on its feature branch and automatic migrations on
 * the weekly-evals-matrix branch. Reading them from the global `branch` (main)
 * returns nothing, which renders as an empty column rather than an error — the
 * exact failure that published a matrix with 0/21 translation cells while ~2,500
 * scored documents sat in the scores cluster.
 */
describe('persona_matrix.config.json extra-suite branch pins', () => {
  const branchByColumn = new Map(config.columns.map((column) => [column.id, column.branch]));

  it('unions main with the branch attack discovery runs were first exported on', () => {
    // Sweep runs export on main; the historical rows live on the feature
    // branch. Pinning only the feature branch filters every new run out, so
    // the column reads the union.
    expect(branchByColumn.get('attack-discovery')).toStrictEqual([
      'main',
      'patrykkopycinski:feat/attack-discovery-agent-builder-evals',
      'feat/evals-extensions-matrix-v3',
    ]);
  });

  it('unions every branch that holds migrations runs for a distinct model', () => {
    // Golden migrations data is split across branches by model: the weekly
    // branch holds six models, 4.6-sonnet has a newer run on the endpoint
    // branch, and 4.5-sonnet only ever ran here. Sweep runs add main. Pinning
    // one branch blanks the others' cells, so the column reads the union.
    const expected = [
      'main',
      'elastic:fix/weekly-evals-matrix',
      'elastic:feat/siem-migrations-invoke-endpoint',
      'feat/evals-extensions-matrix-v3',
    ];

    expect(branchByColumn.get('migrations-rules')).toStrictEqual(expected);
    expect(branchByColumn.get('migrations-dashboards')).toStrictEqual(expected);
  });

  it('keeps both migration columns on one branch set so the suite is queried once', () => {
    // branchBySuiteFromColumns throws on disagreement; asserting equality here
    // names the constraint at the config instead of at a generator stack trace.
    expect(branchByColumn.get('migrations-rules')).toStrictEqual(
      branchByColumn.get('migrations-dashboards')
    );
  });

  it('keeps a lookback window wide enough to reach those runs', () => {
    // The pinned branches last exported 2026-07-30 and 2026-08-11; a 14-day
    // window silently drops them even with the branch pinned correctly.
    expect(config.lookbackDays).toBeGreaterThanOrEqual(45);
  });
});

/**
 * The deterministic behaviour evaluators are per-cell diagnostics. If one is missing from
 * `excludeEvaluators` it silently folds into every cell mean and moves published scores.
 * Overriding `excludeEvaluators` replaces the schema default, so the defaults are listed too.
 */
// Mirrors `DEFAULT_EXCLUDED_EVALUATORS` in @kbn/security-evals-matrix, which the package does not export.
const DEFAULT_EXCLUDED_EVALUATORS = [
  'Latency',
  'Tool Calls',
  'Input Tokens',
  'Output Tokens',
  'Cached Tokens',
  'Skill Invoked',
];

describe.each([
  ['persona_matrix.config.json', config],
  ['persona_matrix.production.config.json', productionConfig],
  ['persona_matrix.parity.config.json', parityConfig],
])('%s excludeEvaluators', (_name, raw) => {
  const excluded: string[] = raw.excludeEvaluators ?? [];

  it('keeps every default observability exclusion', () => {
    expect(DEFAULT_EXCLUDED_EVALUATORS.filter((name) => !excluded.includes(name))).toEqual([]);
  });

  it.each([
    WORKFLOW_VALIDITY_EVALUATOR_NAME,
    EICAR_TRAP_EVALUATOR_NAME,
    SIMULATION_AWARENESS_EVALUATOR_NAME,
    UNREQUESTED_SIDE_EFFECTS_EVALUATOR_NAME,
    STALLED_AFTER_LOAD_SKILL_EVALUATOR_NAME,
    RUBRIC_CAP_NO_TOOL_CALL_EVALUATOR_NAME,
    CHAIN_COVERAGE_EVALUATOR_NAME,
    AD_FAILURE_CLASS_EVALUATOR_NAME,
  ])('excludes %s from cell means', (name) => {
    expect(excluded).toContain(name);
  });
});

/**
 * The matrix report reads `metadata.suite_id`, which the harness records from `EVAL_SUITE_ID`.
 * A parity column only fills when the suite id it names is a registered suite whose run
 * resolves to the parity seed and agent profiles, so the three are asserted together.
 */
describe('persona_matrix.parity.config.json', () => {
  // `--model` ids for the calibration subset; documented in the README.
  const CALIBRATION_MODEL_IDS = [
    'google-gemini-3.1-pro',
    'anthropic-claude-5-sonnet',
    'anthropic-claude-4.6-opus',
    'openai-gpt-oss-120b',
    'openai-gpt-5.4-mini',
  ];

  const parityColumnSuites = [...new Set(parityConfig.columns.flatMap((column) => column.suites))];
  const parityRegistryEntry = suitesMetadata.suites.find(
    (suite) => suite.id === PERSONA_MATRIX_SUITE_IDS['chrysalis-parity']
  );
  const defaultRegistryEntry = suitesMetadata.suites.find(
    (suite) => suite.id === PERSONA_MATRIX_SUITE_IDS.default
  );

  it('reads every column from the registered parity suite id', () => {
    expect(parityColumnSuites).toEqual([PERSONA_MATRIX_SUITE_IDS['chrysalis-parity']]);
    expect(parityRegistryEntry).toBeDefined();
  });

  it('registers the parity suite on its own config file, next to the default one, on the same stack', () => {
    expect(parityRegistryEntry?.configPath).not.toBe(defaultRegistryEntry?.configPath);
    expect(Path.dirname(parityRegistryEntry?.configPath ?? '')).toBe(
      Path.dirname(defaultRegistryEntry?.configPath ?? '')
    );
    expect(
      Fs.existsSync(
        Path.resolve(__dirname, '../../../../../..', parityRegistryEntry?.configPath ?? '')
      )
    ).toBe(true);
    expect(parityRegistryEntry?.serverConfigSet).toBe(defaultRegistryEntry?.serverConfigSet);
    expect(parityRegistryEntry?.ciLabels).toEqual([
      `evals:${PERSONA_MATRIX_SUITE_IDS['chrysalis-parity']}`,
    ]);
    expect(parityRegistryEntry?.excludeFromEvalsAll).toBe(true);
    expect(defaultRegistryEntry?.excludeFromEvalsAll).toBeUndefined();
  });

  it('lists the README calibration models, with their derived connector ids, in the parity config', () => {
    const readme = Fs.readFileSync(Path.resolve(__dirname, '../README.md'), 'utf8');
    const rows = [...readme.matchAll(/^\| `([^`]+)`\s+\| `eis\/([^`]+)`\s+\| `([^`]+)`\s+\|$/gm)];

    expect(rows.map(([, modelId]) => modelId)).toEqual(CALIBRATION_MODEL_IDS);
    for (const [, modelId, group, connectorId] of rows) {
      expect(group).toBe(modelId);
      expect(connectorId).toBe(`eis-${modelId.replace(/\./g, '-')}`);
    }
    const configIds = parityConfig.models.map((model) => model.id);
    expect(CALIBRATION_MODEL_IDS.filter((id) => !configIds.includes(id))).toEqual([]);
  });

  it('resolves the parity suite id to the parity seed and agent, and the default id to neither', () => {
    const parity = resolveSuiteProfileEnv(parityColumnSuites[0], {});
    expect(parity).toEqual({ seed: 'parity', agent: 'chrysalis-parity' });
    expect(resolveAgentProfile(parity.agent)).toBe('chrysalis-parity');
    expect(reportingIdentity('Persona Matrix', 'chrysalis-parity').suite).toBe(
      parityColumnSuites[0]
    );

    expect(resolveSuiteProfileEnv(PERSONA_MATRIX_SUITE_IDS.default, {})).toEqual({
      seed: 'minimal',
      agent: 'default',
    });
  });

  it('has unique model ids and aliases', () => {
    const identifiers = parseMatrixConfig(parityConfig).models.flatMap((model) => [
      model.id,
      ...(model.matchIds ?? []),
    ]);

    expect(identifiers).toHaveLength(new Set(identifiers).size);
  });

  it.each([
    ['persona_matrix.config.json', config],
    ['persona_matrix.production.config.json', productionConfig],
  ])(
    'keeps the aliases %s declares for models it shares with the parity config',
    (_name, other) => {
      const otherAliases = new Map(
        other.models.map((model) => [model.id, (model as { matchIds?: string[] }).matchIds])
      );
      const shared = parityConfig.models.filter((model) => otherAliases.has(model.id));

      expect(shared.length).toBeGreaterThan(0);
      for (const model of shared) {
        expect({ id: model.id, matchIds: (model as { matchIds?: string[] }).matchIds }).toEqual({
          id: model.id,
          matchIds: otherAliases.get(model.id),
        });
      }
    }
  );

  it('includes the calibration models', () => {
    const ids = parityConfig.models.map((model) => model.id);

    expect(CALIBRATION_MODEL_IDS.filter((id) => !ids.includes(id))).toEqual([]);
  });

  it('only requires the columns it declares for the overall score', () => {
    expect(parityConfig.minCoverage).toBeLessThanOrEqual(parityConfig.columns.length);
  });
});
