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
 * Source-level guards for the Family A gates.
 *
 * A2 and A3 passed `result.steps` to `getToolCallSteps`, which expects the whole
 * converse result and reads `.steps` off it. Passing the array made the helper
 * always return an empty list, so both safety gates observed no skill, no draft
 * and no response action — they could stay green while the agent fabricated a
 * draft or executed a containment action. The call is easy to reintroduce (the
 * variable is literally named `steps`), so it is pinned here.
 */

const evalsDir = path.resolve(__dirname, '../../evals');

const specFiles = fs
  .readdirSync(evalsDir)
  .filter((name) => name.endsWith('.spec.ts'))
  .map((name) => path.join(evalsDir, name));

describe('converse-result usage in the Family A specs', () => {
  it('finds the specs it is guarding', () => {
    // Guard against the pattern silently matching nothing after a move/rename.
    expect(specFiles.length).toBeGreaterThan(0);
    expect(specFiles.some((file) => file.endsWith('gate_family_a.spec.ts'))).toBe(true);
  });

  it('never passes a steps array to getToolCallSteps', () => {
    const offenders: string[] = [];
    for (const file of specFiles) {
      const source = fs.readFileSync(file, 'utf8');
      // `getToolCallSteps(result)` is correct; `getToolCallSteps(result.steps)`
      // or `getToolCallSteps(steps)` are not.
      const matches = source.match(/getToolCallSteps\(\s*[\w.]*steps\s*\)/g);
      if (matches) offenders.push(`${path.basename(file)}: ${matches.join(', ')}`);
    }

    expect(offenders).toEqual([]);
  });
});
