/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildValidBrief, FIXTURE_EVIDENCE } from './__fixtures__/evidence';
import { checkConnectivity, connectedComponents } from './connectivity';
import { buildEvidenceIndex } from './evidence_index';

const index = buildEvidenceIndex(FIXTURE_EVIDENCE);
const run = (brief = buildValidBrief(), dropped: string[] = []) =>
  checkConnectivity(brief, { index, dropped: new Set(dropped) });

describe('connectedComponents', () => {
  it('connects entities through links and shared facts', () => {
    expect(connectedComponents(['ENT-1', 'ENT-2', 'ENT-3', 'ENT-4'], index)).toEqual([
      ['ENT-1', 'ENT-2', 'ENT-3', 'ENT-4'],
    ]);
    // ENT-3 and ENT-4 share F-1 even without ENT-1.
    expect(connectedComponents(['ENT-3', 'ENT-4'], index)).toEqual([['ENT-3', 'ENT-4']]);
  });

  it('only uses connections among the given entities', () => {
    // ENT-2 and ENT-3 are only connected through ENT-1.
    expect(connectedComponents(['ENT-2', 'ENT-3'], index)).toEqual([['ENT-2'], ['ENT-3']]);
  });
});

describe('checkConnectivity', () => {
  it('keeps connected threats as they are', () => {
    const brief = buildValidBrief();
    const outcome = run(brief);
    expect(outcome.brief).toEqual(brief);
    expect(outcome.drops).toEqual([]);
    expect(outcome.flags).toEqual([]);
  });

  it('splits a threat that merged unrelated activity down to its largest component', () => {
    const brief = buildValidBrief();
    brief.threats[0].entities = ['ENT-1', 'ENT-4', 'ENT-7'];
    brief.threats[0].evidence = ['F-1', 'L-1', 'F-6'];
    brief.threats[0].keyEvents = ['F-1', 'F-6'];
    const outcome = run(brief);
    expect(outcome.drops).toEqual([]);
    expect(outcome.brief.threats[0]).toEqual(
      expect.objectContaining({
        entities: ['ENT-1', 'ENT-4'],
        evidence: ['F-1', 'L-1'],
        keyEvents: ['F-1'],
      })
    );
    expect(outcome.flags).toEqual([
      expect.objectContaining({
        path: 'threats[0].entities',
        check: 'connectivity',
        message: expect.stringContaining('ENT-7 removed'),
      }),
    ]);
  });

  it('breaks ties in favour of the first-listed entity', () => {
    const brief = buildValidBrief();
    brief.threats[1].entities = ['ENT-7', 'ENT-6'];
    brief.threats[1].evidence = ['F-6', 'F-4'];
    expect(run(brief).brief.threats[1].entities).toEqual(['ENT-7']);
  });

  it('drops a split threat when no cited evidence concerns the kept entities', () => {
    const brief = buildValidBrief();
    brief.threats[1].entities = ['ENT-5', 'ENT-6', 'ENT-7'];
    brief.threats[1].evidence = ['F-6'];
    brief.threats[1].keyEvents = [];
    expect(run(brief).drops).toEqual([
      expect.objectContaining({ path: 'threats[1]', check: 'connectivity' }),
    ]);
  });

  it('skips threats already dropped', () => {
    const brief = buildValidBrief();
    brief.threats[1].entities = ['ENT-5', 'ENT-7'];
    expect(run(brief, ['threats[1]']).flags).toEqual([]);
  });
});
