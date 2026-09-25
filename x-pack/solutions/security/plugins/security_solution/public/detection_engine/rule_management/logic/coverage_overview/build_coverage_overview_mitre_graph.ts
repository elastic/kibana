/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MitreTacticSummary,
  MitreTechniqueSummary,
  MitreSubtechniqueSummary,
} from '@kbn/security-mitre-attack-common';
import type { CoverageOverviewMitreSubTechnique } from '../../model/coverage_overview/mitre_subtechnique';
import type { CoverageOverviewMitreTactic } from '../../model/coverage_overview/mitre_tactic';
import type { CoverageOverviewMitreTechnique } from '../../model/coverage_overview/mitre_technique';
export function buildCoverageOverviewMitreGraph(
  tactics: MitreTacticSummary[],
  techniques: MitreTechniqueSummary[],
  subtechniques: MitreSubtechniqueSummary[]
): CoverageOverviewMitreTactic[] {
  const techniqueToSubtechniquesMap = new Map<string, CoverageOverviewMitreSubTechnique[]>(); // Map(TechniqueId -> SubTechnique[])

  for (const subtechnique of subtechniques) {
    const coverageOverviewMitreSubTechnique = {
      id: subtechnique.id,
      name: subtechnique.name,
      reference: subtechnique.reference,
      enabledRules: [],
      disabledRules: [],
      availableRules: [],
    };

    const techniqueSubtechniques = techniqueToSubtechniquesMap.get(subtechnique.technique_id);

    if (!techniqueSubtechniques) {
      techniqueToSubtechniquesMap.set(subtechnique.technique_id, [
        coverageOverviewMitreSubTechnique,
      ]);
    } else {
      techniqueSubtechniques.push(coverageOverviewMitreSubTechnique);
    }
  }

  const tacticToTechniquesMap = new Map<string, CoverageOverviewMitreTechnique[]>(); // Map(tacticId -> CoverageOverviewMitreTechnique[])

  for (const technique of techniques) {
    const relatedSubtechniques = techniqueToSubtechniquesMap.get(technique.id) ?? [];

    for (const tacticId of technique.tactic_ids) {
      const coverageOverviewMitreTechnique: CoverageOverviewMitreTechnique = {
        id: technique.id,
        name: technique.name,
        reference: technique.reference,
        subtechniques: relatedSubtechniques,
        enabledRules: [],
        disabledRules: [],
        availableRules: [],
      };
      const tacticTechniques = tacticToTechniquesMap.get(tacticId);

      if (!tacticTechniques) {
        tacticToTechniquesMap.set(tacticId, [coverageOverviewMitreTechnique]);
      } else {
        tacticTechniques.push(coverageOverviewMitreTechnique);
      }
    }
  }

  const result: CoverageOverviewMitreTactic[] = [];

  // Tactics arrive in matrix order from the MITRE configuration; no re-sort here.
  for (const tactic of tactics) {
    result.push({
      id: tactic.id,
      name: tactic.name,
      reference: tactic.reference,
      techniques: tacticToTechniquesMap.get(tactic.id) ?? [],
      enabledRules: [],
      disabledRules: [],
      availableRules: [],
    });
  }

  return result;
}
