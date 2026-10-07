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
 * dimension. That happened to `hasSkillInvoke` (composite) and to the
 * confidence / two-sided gap gates (leaf quality); each is pinned here.
 */

const evalsDir = path.resolve(__dirname, '../evals');

/** Spec source with comments removed, so a conjunct only named in prose never counts. */
const specSource = (file: string): string =>
  fs
    .readFileSync(path.join(evalsDir, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

/** The `&&` conjuncts of the spec's `const success = ...;` expression. */
const successConjuncts = (source: string): string[] => {
  const match = source.match(/const success\s*=\s*([^;]+);/);
  if (!match) throw new Error('no `const success = ...;` expression found');
  const expression = match[1];
  // An `||` lets any single conjunct be bypassed; the gate must be a pure AND.
  expect(expression).not.toMatch(/\|\|/);
  return expression.split('&&').map((part) => part.replace(/\s+/g, ' ').trim());
};

describe('raw-log corroboration spec success gates', () => {
  it('composite pipeline requires the skill under test to be invoked', () => {
    const conjuncts = successConjuncts(specSource('composite_pipeline.spec.ts'));
    expect(conjuncts).toEqual(
      expect.arrayContaining([
        'hasEsql',
        'multiStep',
        'structuredOutput',
        'pivotLogic',
        'hasSkillInvoke',
      ])
    );
  });

  it('leaf quality gates on every scored dimension, including confidence and both gap bounds', () => {
    const conjuncts = successConjuncts(specSource('leaf_quality.spec.ts'));
    expect(conjuncts).toEqual(
      expect.arrayContaining([
        'skillInvoked',
        'searchToolCalled',
        'corroborationDepth',
        'corroborationPrecision',
        'gapDetection',
        'gapRestraint',
        'confidenceOk',
        'hasQueryReferences',
      ])
    );
  });

  it('leaf quality gap gate is two-sided with no extra allowance', () => {
    const source = specSource('leaf_quality.spec.ts');
    expect(source).toMatch(/const gapDetection = gapCount >= example\.output\.minGapCount;/);
    expect(source).toMatch(/const gapRestraint = gapCount <= example\.output\.maxGapCount;/);
  });

  it('leaf quality confidence gate reads the dataset minConfidence and fails an unstated one', () => {
    const source = specSource('leaf_quality.spec.ts');
    expect(source).toMatch(
      /const confidenceOk =\s*statedConfidence !== undefined && statedConfidence >= example\.output\.minConfidence;/
    );
  });

  it('leaf quality counts claim units, not distinct word forms', () => {
    const source = specSource('leaf_quality.spec.ts');
    expect(source).toMatch(/const corroboratedCount = countClaimUnits\(/);
    expect(source).toMatch(/const gapCount = countClaimUnits\(/);
  });
});
