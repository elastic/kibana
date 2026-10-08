/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BriefSnapshot,
  BriefValidation,
  EvidenceId,
  ExecutiveBrief,
  ExecutiveBriefDecision,
  ExecutiveBriefStoryline,
  StoryEdge,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { buildEntityIndex } from './entity_mentions';
import { buildNumberMask, collectAllowedNumbers, findInventedNumbers } from './numbers';
import { findUnbackedRelations } from './relations';
import type { UnbackedRelation } from './relations';

export interface ValidateBriefResult {
  brief: ExecutiveBrief;
  validation: BriefValidation;
}

interface ClaimInput {
  /** Number of claims this unit counts as (one per prose field that shares the evidence). */
  claimCount: number;
  /** Prose checked for invented numbers and relations. */
  prose: string[];
  /** Extra prose checked for invented numbers only (e.g. agent prompts are instructions). */
  numberOnlyProse?: string[];
  evidence: readonly string[];
  /** Edges the prose may rely on. */
  edges: StoryEdge[];
}

interface ClaimVerdict {
  keep: boolean;
  validEvidence: EvidenceId[];
}

const hasOwn = (record: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

const isRelatable = (id: string): boolean => /^(?:STORY|GAP|TAC)-/.test(id);

/**
 * Validates a generated brief against the snapshot it was generated from.
 *
 * Rules, per claim (a prose field group with its evidence):
 * - Evidence ids that are not in the catalog are removed and listed; a claim left with no valid
 *   evidence is dropped and counted.
 * - A claim whose prose has a sentence linking two entities without a computed edge (or with a
 *   stronger verb than the edge allows) is dropped, and the sentence is listed.
 * - A claim whose prose has a number not present in the snapshot is dropped, and the number is
 *   listed.
 * Findings are recorded even for claims that were dropped for another reason.
 */
export const validateBrief = ({
  brief,
  snapshot,
}: {
  brief: ExecutiveBrief;
  snapshot: BriefSnapshot;
}): ValidateBriefResult => {
  const index = buildEntityIndex(snapshot);
  const allowedNumbers = collectAllowedNumbers(snapshot);
  const numberMask = buildNumberMask(snapshot, index);
  const { catalog } = snapshot;
  const allEdges = snapshot.storylines.storylines.flatMap((storyline) => storyline.edges);
  const edgesByStory = new Map(
    snapshot.storylines.storylines.map((storyline) => [
      storyline.evidenceId as string,
      storyline.edges,
    ])
  );

  let totalClaims = 0;
  let droppedClaims = 0;
  const invalidIds = new Set<string>();
  const inventedNumbers = new Set<string>();
  const unbackedRelations: UnbackedRelation[] = [];

  const recordRelation = (relation: UnbackedRelation): void => {
    const exists = unbackedRelations.some(
      (r) => r.statement === relation.statement && r.from === relation.from && r.to === relation.to
    );
    if (!exists) {
      unbackedRelations.push(relation);
    }
  };

  const splitEvidence = (ids: readonly string[]): EvidenceId[] => {
    const valid: EvidenceId[] = [];
    ids.forEach((id) => {
      if (hasOwn(catalog, id)) {
        if (!valid.includes(id as EvidenceId)) {
          valid.push(id as EvidenceId);
        }
      } else {
        invalidIds.add(id);
      }
    });
    return valid;
  };

  const evaluate = (claim: ClaimInput): ClaimVerdict => {
    totalClaims += claim.claimCount;
    const validEvidence = splitEvidence(claim.evidence);

    let clean = validEvidence.length > 0;

    claim.prose.forEach((text) => {
      findUnbackedRelations({
        text,
        edges: claim.edges,
        index,
        catalog,
        citedEvidence: validEvidence,
      }).forEach((relation) => {
        recordRelation(relation);
        clean = false;
      });
    });

    [...claim.prose, ...(claim.numberOnlyProse ?? [])].forEach((text) => {
      findInventedNumbers({ text, allowed: allowedNumbers, mask: numberMask }).forEach((n) => {
        inventedNumbers.add(n);
        clean = false;
      });
    });

    if (!clean) {
      droppedClaims += claim.claimCount;
    }
    return { keep: clean, validEvidence };
  };

  // At a glance: headline + narrative share the same evidence.
  const glanceVerdict = evaluate({
    claimCount: 2,
    prose: [brief.glance.headline, brief.glance.threatNarrative],
    evidence: brief.glance.evidence,
    edges: allEdges,
  });
  const glance: ExecutiveBrief['glance'] = glanceVerdict.keep
    ? { ...brief.glance, evidence: glanceVerdict.validEvidence }
    : { headline: '', threatNarrative: '', evidence: glanceVerdict.validEvidence };

  const storylines: ExecutiveBriefStoryline[] = [];
  brief.storylines.forEach((storyline) => {
    const storyEdges = edgesByStory.get(storyline.storylineId);
    if (!storyEdges) {
      invalidIds.add(storyline.storylineId);
      // The storyline does not exist, so its narrative and "why it matters" cannot be backed.
      totalClaims += 2;
      droppedClaims += 2;
      splitEvidence(storyline.evidence);
      return;
    }
    const verdict = evaluate({
      claimCount: 2,
      prose: [storyline.title, storyline.narrative, storyline.whyItMatters],
      evidence: storyline.evidence,
      edges: storyEdges,
    });
    if (verdict.keep) {
      storylines.push({ ...storyline, evidence: verdict.validEvidence });
    }
  });

  let crossStorylineConclusion: ExecutiveBrief['crossStorylineConclusion'];
  if (brief.crossStorylineConclusion) {
    const { statement, confidence, evidence } = brief.crossStorylineConclusion;
    const verdict = evaluate({ claimCount: 1, prose: [statement], evidence, edges: allEdges });
    if (verdict.keep) {
      crossStorylineConclusion = { statement, confidence, evidence: verdict.validEvidence };
    }
  }

  const blindSpotsVerdict = evaluate({
    claimCount: 1,
    prose: [brief.blindSpots.summary],
    evidence: brief.blindSpots.evidence,
    edges: allEdges,
  });
  const blindSpots: ExecutiveBrief['blindSpots'] = blindSpotsVerdict.keep
    ? { summary: brief.blindSpots.summary, evidence: blindSpotsVerdict.validEvidence }
    : { summary: '', evidence: blindSpotsVerdict.validEvidence };

  const decisions: ExecutiveBriefDecision[] = [];
  brief.decisions.forEach((decision) => {
    const relatesToValid = hasOwn(catalog, decision.relatesTo) && isRelatable(decision.relatesTo);
    if (!relatesToValid) {
      invalidIds.add(decision.relatesTo);
    }
    const verdict = evaluate({
      claimCount: 1,
      prose: [decision.action, decision.rationale],
      numberOnlyProse: [decision.agentPrompt],
      evidence: decision.evidence,
      edges: edgesByStory.get(decision.relatesTo) ?? allEdges,
    });
    const targets = splitEvidence(decision.targets);
    if (!verdict.keep || !relatesToValid) {
      if (verdict.keep) {
        // Kept by the shared rules but cannot be linked to a storyline, gap or tactic.
        droppedClaims += 1;
      }
      return;
    }
    decisions.push({ ...decision, evidence: verdict.validEvidence, targets });
  });

  // changeSummary has no evidence field, so it can never be cited: drop it.
  if (brief.changeSummary !== undefined) {
    totalClaims += 1;
    droppedClaims += 1;
  }

  const cleaned: ExecutiveBrief = {
    glance,
    storylines,
    ...(crossStorylineConclusion ? { crossStorylineConclusion } : {}),
    blindSpots,
    decisions,
  };

  return {
    brief: cleaned,
    validation: {
      totalClaims,
      droppedClaims,
      invalidEvidenceIds: [...invalidIds],
      unbackedRelations,
      inventedNumbers: [...inventedNumbers],
    },
  };
};
