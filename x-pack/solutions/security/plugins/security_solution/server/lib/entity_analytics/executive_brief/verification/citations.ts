/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttentionLevel,
  Brief,
  BriefAction,
  BriefThreat,
} from '../../../../../common/entity_analytics/executive_brief/brief';
import type { EvidenceIndex } from './evidence_index';
import {
  EVIDENCE_ID_PATTERN,
  hasFactOrLink,
  isEntityId,
  isKnownId,
  unique,
} from './evidence_index';
import type { BriefCheck, CheckOutcome, Claim } from './types';
import { emptyOutcome, isDropped, listClaims } from './types';

interface Filtered {
  kept: string[];
  removed: string[];
}

const filterIds = (ids: readonly string[], keep: (id: string) => boolean): Filtered => {
  const kept: string[] = [];
  const removed: string[] = [];
  unique(ids).forEach((id) => (keep(id) ? kept.push(id) : removed.push(id)));
  return { kept, removed };
};

/** An absence claim ("nothing to report") at level `clear` needs no evidence. */
const needsEvidence = (index: EvidenceIndex, level: AttentionLevel | undefined): boolean =>
  !index.isEmpty && level !== 'clear';

/** Ids written in the claim's prose that are not in the evidence (invented ids). */
const unknownIdsInProse = (claim: Claim, index: EvidenceIndex): string[] =>
  unique(
    claim.fields.flatMap(({ text }) =>
      [...text.matchAll(EVIDENCE_ID_PATTERN)]
        .map(([id]) => id)
        .filter((id) => !isKnownId(index, id))
    )
  );

const timeOf = (index: EvidenceIndex, id: string): number =>
  Date.parse(index.facts.get(id)?.at ?? '') || 0;

const cleanThreat = (threat: BriefThreat, index: EvidenceIndex, removed: string[]): BriefThreat => {
  const entities = filterIds(threat.entities, (id) => index.entities.has(id));
  // Key events are timeline entries: known facts with a time, in time order.
  const keyEvents = filterIds(threat.keyEvents, (id) => index.facts.get(id)?.at !== undefined);
  const evidence = filterIds(threat.evidence, (id) => isKnownId(index, id));
  removed.push(...entities.removed, ...keyEvents.removed, ...evidence.removed);
  return {
    ...threat,
    entities: entities.kept,
    keyEvents: [...keyEvents.kept].sort((a, b) => timeOf(index, a) - timeOf(index, b)),
    evidence: evidence.kept,
  };
};

const cleanAction = (
  action: BriefAction,
  index: EvidenceIndex,
  threatCount: number,
  removed: string[]
): BriefAction => {
  const targets = filterIds(action.targets, (id) => isEntityId(id) && index.entities.has(id));
  const evidence = filterIds(action.evidence, (id) => isKnownId(index, id));
  removed.push(...targets.removed, ...evidence.removed);
  const { threat, ...rest } = action;
  return {
    ...rest,
    ...(threat !== undefined && threat <= threatCount ? { threat } : {}),
    targets: targets.kept,
    evidence: evidence.kept,
  };
};

/**
 * Citations: unknown ids are removed from every id list; a claim left without a fact or link to
 * back it is dropped (structural for the verdict), as is a claim whose prose names an id that is
 * not in the evidence. Threats need at least one known entity.
 */
export const checkCitations: BriefCheck = (input, context): CheckOutcome => {
  const { index } = context;
  const removed: string[] = [];
  const brief: Brief = {
    verdict: {
      ...input.verdict,
      evidence: filterIds(input.verdict.evidence, (id) => isKnownId(index, id)).kept,
    },
    areas: input.areas.map((area) => ({
      ...area,
      evidence: filterIds(area.evidence, (id) => isKnownId(index, id)).kept,
    })),
    threats: input.threats.map((threat) => cleanThreat(threat, index, removed)),
    actions: input.actions.map((action) =>
      cleanAction(action, index, input.threats.length, removed)
    ),
  };
  [input.verdict.evidence, ...input.areas.map(({ evidence }) => evidence)].forEach((ids) =>
    removed.push(...ids.filter((id) => !isKnownId(index, id)))
  );

  const outcome = emptyOutcome(brief);
  if (removed.length > 0) {
    outcome.notes.push(`removed unknown or misplaced ids: ${unique(removed).join(', ')}`);
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
    if (needsEvidence(index, claim.level) && !hasFactOrLink(index, claim.evidence)) {
      reasons.push('it cites no known fact (F-n) or link (L-n)');
    }
    if (claim.path?.startsWith('threats[') && claim.entities.length === 0) {
      reasons.push('it lists no known entity (ENT-n)');
    }
    if (reasons.length === 0) {
      return;
    }
    const reason = reasons.join('; ');
    if (claim.path === undefined) {
      outcome.structuralErrors.push(`verdict: ${reason}.`);
    } else {
      outcome.drops.push({ path: claim.path, check: 'citation', reason });
    }
  });
  return outcome;
};
