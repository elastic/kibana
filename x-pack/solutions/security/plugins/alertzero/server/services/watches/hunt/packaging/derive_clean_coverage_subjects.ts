/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoverageSubjectState } from './derive_coverage_subjects';
import { deriveCoverageSubjects } from './derive_coverage_subjects';
import type { ReportHuntContext } from './load_report_hunt_context';
import { toCoverageBehaviors } from './select_coverage_behavior';
import type { CoordinatorInputs, CoverageSubject } from './types';

/**
 * Coverage subjects for a run that cleared no hit and so left no SSE: the report-scoped
 * subject plus one per technique Tier 2 executed a query for, each carrying that technique's
 * own `validated_esql`. Report techniques Tier 2 never executed are named inside the
 * report-scoped `threat_summary` rather than minted as subjects.
 */
export const deriveCleanCoverageSubjects = ({
  spaceId,
  reportId,
  inputs,
  reportContext,
  severity,
  investigationSummary,
  investigationConversationId,
}: {
  spaceId: string;
  reportId: string;
  inputs: CoordinatorInputs;
  reportContext?: ReportHuntContext;
  severity?: string;
  investigationSummary?: string;
  investigationConversationId: string;
}): CoverageSubject[] => {
  const executedTechniques = [
    ...new Set(toCoverageBehaviors(inputs.behaviors ?? []).map((behavior) => behavior.techniqueId)),
  ];
  const base: Omit<CoverageSubjectState, 'techniques'> = {
    reportId,
    hasConfirmedHit: false,
    corroboratedTechniques: [],
    coordinator: inputs,
    reportContext,
    severity,
    investigationSummary,
  };
  const derive = (techniques: string[]) =>
    deriveCoverageSubjects({
      spaceId,
      state: { ...base, techniques },
      investigationConversationId,
    });

  return [...derive([]), ...(executedTechniques.length > 0 ? derive(executedTechniques) : [])];
};
