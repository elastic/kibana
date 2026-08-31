/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import config from '../persona_matrix.config.json';
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
