/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCoverageKiId } from './coverage_ki_id';
import type { CoverageSubject, CurrentRunState } from './types';

/**
 * The slice of `CurrentRunState` this needs. Narrowed (rather than the full state) so a run
 * with no current-run SSE at all -- a real clean run -- can still derive a report-scoped
 * subject without fabricating fields it has no data for. `corroboratedTechniques` defaults to
 * empty for that same caller: a run with no SSE at all corroborated nothing.
 *
 * `threatSummary`, `dataSources`, `severity`, and `investigationSummary` are resolved by the
 * caller before this call (SSE-sourced on hit, report-sourced with SSE fallback on no-hit; see
 * `run_package_report.ts`), so this function stays pure and run-scoped: the same resolved
 * values apply to every subject this run derives, there is no per-technique source rule.
 */
export type CoverageSubjectState = Pick<
  CurrentRunState,
  'reportId' | 'techniques' | 'hasConfirmedHit' | 'corroboratedTechniques'
> &
  Partial<Pick<CurrentRunState, 'dataSources' | 'severity'>> & {
    threatSummary?: string;
    investigationSummary?: string;
  };

/**
 * One coverage subject per technique on the current run; report-scoped when the
 * run named no techniques. Written for every swept report (hit or clean).
 *
 * A technique only claims a confirmed hit when it is in `state.corroboratedTechniques`:
 * a technique merely proposed (named on the report-scoped fallback entry's indicator
 * list, never individually corroborated) reads as an uneventful sweep instead, even
 * when `state.hasConfirmedHit` is true for the report as a whole.
 */
export const deriveCoverageSubjects = ({
  spaceId,
  state,
  investigationConversationId,
}: {
  spaceId: string;
  state: CoverageSubjectState;
  investigationConversationId: string;
}): CoverageSubject[] => {
  const techniqueIds = state.techniques.length > 0 ? [...new Set(state.techniques)] : [undefined];

  return techniqueIds.map((techniqueId) => {
    const kiId = buildCoverageKiId({
      spaceId,
      reportId: state.reportId,
      techniqueId,
    });
    const techniqueLabel = techniqueId ?? 'report';
    const confirmedHitForSubject =
      techniqueId !== undefined
        ? state.corroboratedTechniques.includes(techniqueId)
        : state.hasConfirmedHit;
    return {
      kiId,
      reportId: state.reportId,
      technique: techniqueId,
      investigationConversationId,
      title: `Coverage: ${techniqueLabel} (${state.reportId})`,
      description: `Coverage subject ${techniqueLabel} swept by Hunt Watch. Investigation ${investigationConversationId}.`,
      content: confirmedHitForSubject
        ? `Hunt confirmed a hit for ${techniqueLabel} on report ${state.reportId}.`
        : `Hunt swept ${techniqueLabel} on report ${state.reportId} with no confirmed hit.`,
      threatSummary: state.threatSummary,
      dataSources: state.dataSources ?? [],
      severity: state.severity,
      investigationSummary: state.investigationSummary,
      hasConfirmedHit: confirmedHitForSubject,
    };
  });
};
