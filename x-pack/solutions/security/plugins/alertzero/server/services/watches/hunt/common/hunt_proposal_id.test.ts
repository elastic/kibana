/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate as isUuid } from 'uuid';
import { z } from '@kbn/zod/v4';
import { buildHuntProposalId } from './hunt_proposal_id';

const base = { spaceId: 'default', subjectKey: 'subject-key-1', generation: 0 };

describe('buildHuntProposalId', () => {
  it('derives the same id for the same subject every time, so two runs meet at one proposal', () => {
    expect(buildHuntProposalId(base)).toBe(buildHuntProposalId({ ...base }));
  });

  it('derives different ids for different subjects', () => {
    expect(buildHuntProposalId(base)).not.toBe(
      buildHuntProposalId({ ...base, subjectKey: 'subject-key-2' })
    );
  });

  it('derives different ids in different spaces, since the index is shared and the service does not scope the id', () => {
    expect(buildHuntProposalId(base)).not.toBe(buildHuntProposalId({ ...base, spaceId: 'other' }));
  });

  it('derives a different id for each generation, which is how a settled proposal is followed by a new one', () => {
    const ids = [0, 1, 2, 3].map((generation) => buildHuntProposalId({ ...base, generation }));

    expect(new Set(ids).size).toBe(4);
  });

  it('produces an id the Proposals service accepts', () => {
    const id = buildHuntProposalId(base);

    expect(isUuid(id)).toBe(true);
    // The service and the workflow step both validate `id` / `proposalId` with `z.uuid()`.
    expect(z.uuid().safeParse(id).success).toBe(true);
  });

  it('is pinned, because changing the namespace or the material strands every live proposal', () => {
    expect(buildHuntProposalId(base)).toBe('d54234ae-360c-5e2d-ab58-0b2b434258c4');
  });
});
