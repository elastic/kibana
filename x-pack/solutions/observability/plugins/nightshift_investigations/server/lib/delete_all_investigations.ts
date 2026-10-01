/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';
import type { DeleteAllInvestigationsResult, InvestigationSweepRepository } from '../storage';

/**
 * Deletes Nightshift investigations in every space: the legacy saved objects and the shared
 * investigation data (subjects, claims, impact, hypotheses). The Agent Builder conversations stay;
 * Agent Builder has no cross-space delete for them.
 */
export const deleteAllInvestigations = async ({
  sweepRepository,
  agenticInvestigations,
}: {
  sweepRepository: Pick<InvestigationSweepRepository, 'deleteAllAcrossSpaces'>;
  agenticInvestigations?: Pick<
    AgenticInvestigationsPluginStart,
    'deleteSubjectInvestigationDataAcrossSpaces'
  >;
}): Promise<DeleteAllInvestigationsResult> => {
  // TODO(ns-1619 s6): drop the saved-object sweep with the saved object type.
  const result = await sweepRepository.deleteAllAcrossSpaces();
  if (!agenticInvestigations) {
    return result;
  }
  const investigationData =
    await agenticInvestigations.deleteSubjectInvestigationDataAcrossSpaces();
  return { ...result, investigationData };
};
