/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildCoverageKiId, buildCoverageSubject } from './coverage_ki_id';
import type { CoverageSubject, CurrentRunState } from './types';

/**
 * One coverage subject per technique on the current run; report-scoped when the
 * run named no techniques. Written for every swept report (hit or clean).
 */
export const deriveCoverageSubjects = ({
  spaceId,
  state,
  investigationConversationId,
}: {
  spaceId: string;
  state: CurrentRunState;
  investigationConversationId: string;
}): CoverageSubject[] => {
  const techniqueIds = state.techniques.length > 0 ? [...new Set(state.techniques)] : [undefined];

  return techniqueIds.map((techniqueId) => {
    const subject = buildCoverageSubject({ reportId: state.reportId, techniqueId });
    const kiId = buildCoverageKiId({
      spaceId,
      reportId: state.reportId,
      techniqueId,
    });
    const techniqueLabel = techniqueId ?? 'report';
    // The validated query, when this technique is the one that hit: what Detection Watch
    // reads to decide, on its own, whether the hunt is worth a lasting rule. Hunt Watch's
    // job ends at reporting what it searched with and what it found.
    const query = techniqueId ? state.huntedTechniqueQueries[techniqueId] : undefined;
    const content = state.hasConfirmedHit
      ? `Hunt confirmed a hit for ${techniqueLabel} on report ${state.reportId}.`
      : `Hunt swept ${techniqueLabel} on report ${state.reportId} with no confirmed hit.`;
    return {
      kiId,
      subject,
      technique: techniqueId,
      title: `Coverage: ${techniqueLabel} (${state.reportId})`,
      description: `Coverage subject ${techniqueLabel} swept by Hunt Watch. Investigation ${investigationConversationId}.`,
      content: query ? `${content}\n\nQuery that found the hit:\n${query}` : content,
    };
  });
};
