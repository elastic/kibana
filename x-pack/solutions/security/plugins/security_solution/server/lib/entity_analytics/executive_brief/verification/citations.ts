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
import { hasFactOrLink, unique } from './evidence_index';
import type { BriefCheck, CheckOutcome } from './types';
import { emptyOutcome, isDropped, listClaims, reportClaim } from './types';

/** Only an absence claim ("nothing to report") at level `clear` needs no citation. */
const needsEvidence = (level: AttentionLevel): boolean => level !== 'clear';

/**
 * Citations: ids that are not facts or links of the evidence are removed from every `factIds` and
 * `linkIds` list. A claim above `clear` left without a fact or link to back it is dropped; for the
 * verdict this is structural.
 */
export const checkCitations: BriefCheck = (input, context): CheckOutcome => {
  const { index } = context;
  const removedFactIds: number[] = [];
  const removedLinkIds: number[] = [];
  const keepKnown = (
    ids: readonly number[],
    known: ReadonlyMap<number, unknown>,
    removed: number[]
  ): number[] =>
    unique(ids).filter((id) => {
      if (!known.has(id)) {
        removed.push(id);
      }
      return known.has(id);
    });
  const keepKnownFacts = (ids: readonly number[]) => keepKnown(ids, index.facts, removedFactIds);
  const keepKnownLinks = (ids: readonly number[]) => keepKnown(ids, index.links, removedLinkIds);

  const brief: Brief = {
    verdict: {
      ...input.verdict,
      factIds: keepKnownFacts(input.verdict.factIds),
      linkIds: keepKnownLinks(input.verdict.linkIds),
    },
    areas: input.areas.map((area) => ({
      ...area,
      factIds: keepKnownFacts(area.factIds),
      linkIds: keepKnownLinks(area.linkIds),
    })),
  };

  const outcome = emptyOutcome(brief);
  if (removedFactIds.length > 0) {
    outcome.notes.push(`removed unknown fact ids: ${unique(removedFactIds).join(', ')}`);
  }
  if (removedLinkIds.length > 0) {
    outcome.notes.push(`removed unknown link ids: ${unique(removedLinkIds).join(', ')}`);
  }

  listClaims(brief).forEach((claim) => {
    if (isDropped(context, claim.path)) {
      return;
    }
    if (needsEvidence(claim.level) && !hasFactOrLink(index, claim.factIds, claim.linkIds)) {
      reportClaim(
        outcome,
        claim,
        'citation',
        'it cites no known fact or link in factIds or linkIds'
      );
    }
  });
  return outcome;
};
