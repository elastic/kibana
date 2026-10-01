/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteAllInvestigations } from './delete_all_investigations';

describe('deleteAllInvestigations', () => {
  const sweepRepository = {
    deleteAllAcrossSpaces: jest.fn().mockResolvedValue({ deleted: 2, failures: [] }),
  };

  it('deletes the saved objects and the shared investigation data in every space', async () => {
    const investigationData = { subjects: 3, subjectClaims: 3, impact: 1, hypotheses: 1 };
    const agenticInvestigations = {
      deleteSubjectInvestigationDataAcrossSpaces: jest.fn().mockResolvedValue(investigationData),
    };

    await expect(
      deleteAllInvestigations({ sweepRepository, agenticInvestigations })
    ).resolves.toEqual({ deleted: 2, failures: [], investigationData });
  });

  it('only deletes the saved objects without agentic investigations', async () => {
    await expect(deleteAllInvestigations({ sweepRepository })).resolves.toEqual({
      deleted: 2,
      failures: [],
    });
  });
});
