/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgenticInvestigationsPluginStart,
  DeleteInvestigationDataAcrossSpacesResult,
} from '@kbn/agentic-investigations-plugin/server';

export interface DeleteAllInvestigationsResult {
  /**
   * The investigations whose shared data was removed, and the documents per index. Absent without
   * agentic investigations.
   */
  investigationData?: DeleteInvestigationDataAcrossSpacesResult;
}

/**
 * Deletes the shared investigation data (subjects, claims, impact, hypotheses) of Nightshift
 * investigations in every space. The Agent Builder conversations stay; Agent Builder has no
 * cross-space delete for them.
 */
export const deleteAllInvestigations = async ({
  agenticInvestigations,
}: {
  agenticInvestigations?: Pick<
    AgenticInvestigationsPluginStart,
    'deleteSubjectInvestigationDataAcrossSpaces'
  >;
}): Promise<DeleteAllInvestigationsResult> => {
  if (!agenticInvestigations) {
    return {};
  }
  const investigationData =
    await agenticInvestigations.deleteSubjectInvestigationDataAcrossSpaces();
  return { investigationData };
};
