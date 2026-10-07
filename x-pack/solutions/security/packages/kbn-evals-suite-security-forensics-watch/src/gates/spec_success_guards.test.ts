/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-nodejs-modules -- the guard reads spec sources off disk */
import fs from 'fs';
import path from 'path';

/**
 * Source-level guards for the `success` gates of the Playwright specs.
 *
 * The specs compute their gate signals inline and Jest never loads them, so a
 * signal that is computed, logged and scored but left out of `success` keeps
 * every unit test green while the eval goes green on a run that failed that
 * dimension. That happened to the forensic-quality dimensions of the leaf
 * spec (timeline, IoC validation, confidence) and to the Evaluation Record
 * shape of the durable-outcome spec; each is pinned here. The shape check
 * itself is covered behaviourally in `durable_outcome.test.ts`.
 */

const evalsDir = path.resolve(__dirname, '../../evals');

/** Spec source with comments removed, so a conjunct only named in prose never counts. */
const specSource = (file: string): string =>
  fs
    .readFileSync(path.join(evalsDir, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

/** The `&&` conjuncts of a `const success = ...;` or `success: ...,` expression. */
const successConjuncts = (source: string): string[] => {
  const match =
    source.match(/const success\s*=\s*([^;]+);/) ?? source.match(/\bsuccess:\s*([^,]+),/);
  if (!match) throw new Error('no success expression found');
  const expression = match[1];
  // An `||` lets any single conjunct be bypassed; the gate must be a pure AND.
  expect(expression).not.toMatch(/\|\|/);
  return expression.split('&&').map((part) => part.replace(/\s+/g, ' ').trim());
};

describe('forensics watch spec success gates', () => {
  it('leaf quality gates on the forensic-quality dimensions it computes', () => {
    const conjuncts = successConjuncts(specSource('leaf_quality.spec.ts'));
    expect(conjuncts).toEqual(
      expect.arrayContaining([
        'skillInvoked',
        'packageEvidenceCalled',
        'produceDraftCalled',
        'draftLabelOk',
        'noExecutionOk',
        'questionsOk',
        'timelineOk',
        'iocGate.success',
        'confidenceOk',
        'esqlOk',
        'persistenceOk',
        'l2Ok',
      ])
    );
  });

  it('durable outcome gates on the run-correlated, shape-valid readback', () => {
    const conjuncts = successConjuncts(specSource('durable_outcome.spec.ts'));
    expect(conjuncts).toEqual(expect.arrayContaining(['produceDraftCalled', 'durable.success']));
  });
});
