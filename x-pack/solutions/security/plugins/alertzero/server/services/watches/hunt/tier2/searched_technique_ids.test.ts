/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BehaviorExecution, ValidatedBehavior } from './types';
import { MAX_HUNT_TECHNIQUE_IDS } from '../common/hunt_technique_limit';
import { getSearchedTechniqueIds } from './searched_technique_ids';

const behavior = (techniqueId: string, execution?: BehaviorExecution): ValidatedBehavior =>
  ({ technique_id: techniqueId, execution } as ValidatedBehavior);

const executed: BehaviorExecution = { executed: true, row_count: 0, hit: false };

describe('getSearchedTechniqueIds', () => {
  it('lists a behavior whose query executed, with or without rows', () => {
    expect(
      getSearchedTechniqueIds({
        behaviors: [
          behavior('T1001', executed),
          behavior('T1002', { executed: true, row_count: 4, hit: true }),
        ],
      })
    ).toEqual(['T1001', 'T1002']);
  });

  it('leaves out a behavior that never executed', () => {
    expect(
      getSearchedTechniqueIds({
        behaviors: [
          behavior('T1001', { executed: false, row_count: 0, hit: false }),
          behavior('T1002'),
        ],
      })
    ).toEqual([]);
  });

  it('counts an executed behavior whose inconclusive result a retry would reproduce', () => {
    // `rows_unclassifiable` and `refs_unavailable` are final in `completeness.ts`: the same query
    // returns the same rows, so leaving the technique out would re-spend a budget slot on it every run.
    expect(
      getSearchedTechniqueIds({
        behaviors: [
          behavior('T1001', { ...executed, inconclusive_reason: 'rows_unclassifiable' }),
          behavior('T1002', { ...executed, inconclusive_reason: 'refs_unavailable' }),
        ],
      })
    ).toEqual(['T1001', 'T1002']);
  });

  it('leaves out an executed behavior whose inconclusive result a retry could change', () => {
    expect(
      getSearchedTechniqueIds({
        behaviors: [behavior('T1001', { ...executed, inconclusive_reason: 'execute_failed' })],
      })
    ).toEqual([]);
  });

  it('counts a technique collapsed onto a sibling query as searched', () => {
    expect(
      getSearchedTechniqueIds({
        behaviors: [behavior('T1001', executed)],
        incomplete: [{ reason: 'collapsed', detail: 'shared artifacts', technique_id: 'T1002' }],
      })
    ).toEqual(['T1001', 'T1002']);
  });

  it('does not count techniques that lost the budget or failed', () => {
    expect(
      getSearchedTechniqueIds({
        behaviors: [],
        incomplete: [
          { reason: 'generation_budget', detail: 'over budget', technique_id: 'T1001' },
          { reason: 'execute_failed', detail: 'failed', technique_id: 'T1002' },
          { reason: 'collapsed', detail: 'no technique id' },
        ],
      })
    ).toEqual([]);
  });

  it('lists a technique once when it is both executed and collapsed', () => {
    expect(
      getSearchedTechniqueIds({
        behaviors: [behavior('T1001', executed)],
        incomplete: [{ reason: 'collapsed', detail: 'shared artifacts', technique_id: 'T1001' }],
      })
    ).toEqual(['T1001']);
  });

  it('caps the list at the contract bound', () => {
    const behaviors = Array.from({ length: MAX_HUNT_TECHNIQUE_IDS + 5 }, (_, i) =>
      behavior(`T${2000 + i}`, executed)
    );

    expect(getSearchedTechniqueIds({ behaviors })).toHaveLength(MAX_HUNT_TECHNIQUE_IDS);
  });
});
