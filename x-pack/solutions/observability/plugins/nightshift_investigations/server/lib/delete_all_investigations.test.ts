/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteAllInvestigations } from './delete_all_investigations';

describe('deleteAllInvestigations', () => {
  it('deletes the shared investigation data in every space', async () => {
    const investigationData = {
      investigations: 2,
      subjects: 3,
      subjectClaims: 3,
      impact: 1,
      hypotheses: 1,
      complete: true,
    };
    const agenticInvestigations = {
      deleteSubjectInvestigationDataAcrossSpaces: jest.fn().mockResolvedValue(investigationData),
    };

    await expect(deleteAllInvestigations({ agenticInvestigations })).resolves.toEqual({
      investigationData,
    });
  });

  it('deletes nothing without agentic investigations', async () => {
    await expect(deleteAllInvestigations({})).resolves.toEqual({});
  });
});
