/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_HUNT_TECHNIQUE_IDS } from '../common/hunt_technique_limit';
import { getPendingTechniqueIds } from './pending_technique_ids';
import type { BehaviorExecution, ValidatedBehavior } from './types';

const behavior = (techniqueId: string, execution?: BehaviorExecution): ValidatedBehavior =>
  ({ technique_id: techniqueId, execution } as ValidatedBehavior);

describe('getPendingTechniqueIds', () => {
  it('lists the techniques named by a retryable gap', () => {
    expect(
      getPendingTechniqueIds({
        behaviors: [],
        incomplete: [
          { reason: 'execute_failed', detail: 'failed', technique_id: 'T1001' },
          { reason: 'quote_ungrounded', detail: 'not in the report', technique_id: 'T1002' },
        ],
      })
    ).toEqual(['T1001', 'T1002']);
  });

  it('leaves out a technique whose gap a retry would reproduce', () => {
    expect(
      getPendingTechniqueIds({
        behaviors: [],
        incomplete: [
          { reason: 'collapsed', detail: 'shared artifacts', technique_id: 'T1001' },
          { reason: 'unknown_technique_id', detail: 'not in the catalog', technique_id: 'T1002' },
        ],
      })
    ).toEqual([]);
  });

  it('leaves out a retryable gap that names no technique', () => {
    expect(
      getPendingTechniqueIds({
        behaviors: [],
        incomplete: [{ reason: 'search_partial', detail: 'a shard failed' }],
      })
    ).toEqual([]);
  });

  it('lists a technique once', () => {
    expect(
      getPendingTechniqueIds({
        behaviors: [],
        incomplete: [
          { reason: 'execute_failed', detail: 'failed', technique_id: 'T1001' },
          { reason: 'generation_failed', detail: 'failed', technique_id: 'T1001' },
        ],
      })
    ).toEqual(['T1001']);
  });

  it('is empty when there are no gaps', () => {
    expect(getPendingTechniqueIds({ behaviors: [] })).toEqual([]);
  });

  it('stops at the shared technique limit', () => {
    const incomplete = Array.from({ length: MAX_HUNT_TECHNIQUE_IDS + 5 }, (_, index) => ({
      reason: 'execute_failed' as const,
      detail: 'failed',
      technique_id: `T${index}`,
    }));

    expect(getPendingTechniqueIds({ behaviors: [], incomplete })).toHaveLength(
      MAX_HUNT_TECHNIQUE_IDS
    );
  });

  it('leaves out a technique this run searched, even when another candidate for it left a gap', () => {
    expect(
      getPendingTechniqueIds({
        behaviors: [behavior('T1001', { executed: true, row_count: 0, hit: false })],
        incomplete: [
          { reason: 'quote_ungrounded', detail: 'not in the report', technique_id: 'T1001' },
          { reason: 'execute_failed', detail: 'failed', technique_id: 'T1002' },
        ],
      })
    ).toEqual(['T1002']);
  });

  it('leaves out the reasons the caller treats as final for this run', () => {
    expect(
      getPendingTechniqueIds(
        {
          behaviors: [],
          incomplete: [
            { reason: 'query_ungrounded', detail: 'no literal matched', technique_id: 'T1001' },
            { reason: 'execute_failed', detail: 'failed', technique_id: 'T1002' },
          ],
        },
        { treatAsFinal: new Set(['query_ungrounded']) }
      )
    ).toEqual(['T1002']);
  });
});
