/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttentionLevel,
  Brief,
} from '../../../../../common/entity_analytics/executive_brief/brief';
import type { EvidenceIndex } from './evidence_index';
import { EVIDENCE_ID_PATTERN, hasFactOrLink, isKnownId, unique } from './evidence_index';
import type { BriefCheck, CheckOutcome, Claim } from './types';
import { emptyOutcome, isDropped, listClaims, reportClaim } from './types';

/** Only an absence claim ("nothing to report") at level `clear` needs no citation. */
const needsEvidence = (level: AttentionLevel): boolean => level !== 'clear';

/** Ids written in the claim's prose that are not in the evidence (invented ids). */
const unknownIdsInProse = (claim: Claim, index: EvidenceIndex): string[] =>
  unique(
    claim.fields.flatMap(({ text }) =>
      [...text.matchAll(EVIDENCE_ID_PATTERN)]
        .map(([id]) => id)
        .filter((id) => !isKnownId(index, id))
    )
  );

/**
 * Citations: unknown ids are removed from every evidence list. A claim left without a fact or
 * link to back it, or whose prose names an id that is not in the evidence, is dropped; for the
 * verdict this is structural.
 */
export const checkCitations: BriefCheck = (input, context): CheckOutcome => {
  const { index } = context;
  const removed: string[] = [];
  const keepKnown = (ids: readonly string[]): string[] =>
    unique(ids).filter((id) => {
      const known = isKnownId(index, id);
      if (!known) {
        removed.push(id);
      }
      return known;
    });

  const brief: Brief = {
    verdict: { ...input.verdict, evidence: keepKnown(input.verdict.evidence) },
    areas: input.areas.map((area) => ({ ...area, evidence: keepKnown(area.evidence) })),
  };

  const outcome = emptyOutcome(brief);
  if (removed.length > 0) {
    outcome.notes.push(`removed unknown ids: ${unique(removed).join(', ')}`);
  }

  listClaims(brief).forEach((claim) => {
    if (isDropped(context, claim.path)) {
      return;
    }
    const reasons: string[] = [];
    const invented = unknownIdsInProse(claim, index);
    if (invented.length > 0) {
      reasons.push(`its text names ids that are not in the evidence: ${invented.join(', ')}`);
    }
    if (needsEvidence(claim.level) && !hasFactOrLink(index, claim.evidence)) {
      reasons.push('it cites no known fact (F-n) or link (L-n)');
    }
    if (reasons.length > 0) {
      reportClaim(outcome, claim, 'citation', reasons.join('; '));
    }
  });
  return outcome;
};
