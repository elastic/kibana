/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BriefNarrationMode,
  BriefSnapshot,
  BriefValidation,
  EvidenceId,
  ExecutiveBrief,
  ExecutiveBriefDecision,
  ExecutiveBriefStoryline,
  StoryEdge,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { buildTemplateGlance } from '../generation/template_brief_generator';
import { buildEntityIndex } from './entity_mentions';
import { buildNumberMask, collectAllowedNumbers, findInventedNumbers } from './numbers';
import { findUnbackedRelations } from './relations';
import type { RelationFinding } from './relations';

export interface ValidateBriefResult {
  brief: ExecutiveBrief;
  validation: BriefValidation;
}

type ClaimFlag = NonNullable<BriefValidation['flags']>[number];

interface ClaimField {
  /** Sub-path inside the claim, e.g. `narrative`. */
  key: string;
  /** Prose checked for invented numbers and relations. */
  text: string;
  /** A blank required field makes the claim unusable. */
  required?: boolean;
}

interface ClaimInput {
  /** Number of claims this unit counts as (one per prose field that shares the evidence). */
  claimCount: number;
  fields: ClaimField[];
  /** Extra prose checked for invented numbers only (e.g. agent prompts are instructions). */
  numberOnlyProse?: string[];
  evidence: readonly string[];
  /** Edges the prose may rely on. */
  edges: StoryEdge[];
}

interface ClaimVerdict {
  keep: boolean;
  validEvidence: EvidenceId[];
  /** Weak unbacked relations: the claim stays, flagged under the field they were found in. */
  flags: Array<{ fieldKey: string; statement: string; reason: string }>;
}

const hasOwn = (record: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

const isRelatable = (id: string): boolean => /^(?:STORY|GAP|TAC)-/.test(id);

const isBlank = (text: string): boolean => text.trim().length === 0;

/**
 * Validates a generated brief against the snapshot it was generated from.
 *
 * Rules, per claim (a prose field group with its evidence):
 * - Evidence ids that are not in the catalog are removed and listed; a claim left with no valid
 *   evidence is dropped and counted.
 * - A number in the prose that is not in the snapshot drops the claim and is listed. UUIDs, ISO
 *   dates and IP addresses are not numbers.
 * - A strong relation without backing (lateral movement, compromise, exfiltration between two
 *   entities) drops the claim. A weak one (a verb between two entities that no computed edge
 *   supports) keeps the claim and records a flag. Only explicit predicates between two entities
 *   are relations; co-mention and enumeration are not.
 * - A glance that cannot be kept is replaced by the template glance and flagged `fallback`.
 * Findings are recorded even for claims that were dropped for another reason.
 */
export const validateBrief = ({
  brief,
  snapshot,
  mode = 'names',
}: {
  brief: ExecutiveBrief;
  snapshot: BriefSnapshot;
  /** Narration mode of the brief; only used to write the template glance fallback. */
  mode?: BriefNarrationMode;
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
  const entitiesByStory = new Map(
    snapshot.storylines.storylines.map((storyline) => [
      storyline.evidenceId as string,
      new Set([...storyline.entityEuids, ...storyline.hubEuids]),
    ])
  );

  let totalClaims = 0;
  let droppedClaims = 0;
  const invalidIds = new Set<string>();
  const inventedNumbers = new Set<string>();
  const unbackedRelations: BriefValidation['unbackedRelations'] = [];
  const flags: ClaimFlag[] = [];

  const recordRelation = ({ statement, from, to }: RelationFinding): void => {
    const exists = unbackedRelations.some(
      (r) => r.statement === statement && r.from === from && r.to === to
    );
    if (!exists) {
      unbackedRelations.push({ statement, from, to });
    }
  };

  const addFlag = (flag: ClaimFlag): void => {
    const exists = flags.some(
      (f) =>
        f.claimPath === flag.claimPath && f.statement === flag.statement && f.reason === flag.reason
    );
    if (!exists) {
      flags.push(flag);
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
    const verdictFlags: ClaimVerdict['flags'] = [];

    let clean = validEvidence.length > 0;

    // A claim that cites two or more storylines compares them: entity pairs that sit in
    // different cited storylines are not expected to have an edge.
    const citedStories = validEvidence.filter((id) => entitiesByStory.has(id));
    const isComparisonPair =
      citedStories.length >= 2
        ? (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => {
            const memberOf = (group: ReadonlySet<string>, story: string): boolean =>
              [...group].some((euid) => entitiesByStory.get(story)?.has(euid));
            const inAny = (group: ReadonlySet<string>): boolean =>
              citedStories.some((story) => memberOf(group, story));
            const together = citedStories.some((story) => memberOf(a, story) && memberOf(b, story));
            return inAny(a) && inAny(b) && !together;
          }
        : undefined;

    claim.fields.forEach(({ key, text, required }) => {
      if (required && isBlank(text)) {
        clean = false;
      }
      findUnbackedRelations({
        text,
        edges: claim.edges,
        index,
        catalog,
        citedEvidence: validEvidence,
        isComparisonPair,
      }).forEach((finding) => {
        recordRelation(finding);
        if (finding.strength === 'strong') {
          clean = false;
        } else {
          verdictFlags.push({
            fieldKey: key,
            statement: finding.statement,
            reason: finding.reason,
          });
        }
      });
    });

    [...claim.fields.map(({ text }) => text), ...(claim.numberOnlyProse ?? [])].forEach((text) => {
      findInventedNumbers({ text, allowed: allowedNumbers, mask: numberMask }).forEach((n) => {
        inventedNumbers.add(n);
        clean = false;
      });
    });

    if (!clean) {
      droppedClaims += claim.claimCount;
    }
    return { keep: clean, validEvidence, flags: verdictFlags };
  };

  const flagAt = (claimPath: string, verdict: ClaimVerdict, fieldKey?: string): void => {
    verdict.flags
      .filter((flag) => fieldKey === undefined || flag.fieldKey === fieldKey)
      .forEach(({ statement, reason }) => addFlag({ claimPath, statement, reason }));
  };

  // At a glance: headline + narrative share the same evidence.
  const glanceVerdict = evaluate({
    claimCount: 2,
    fields: [
      { key: 'headline', text: brief.glance.headline },
      { key: 'threatNarrative', text: brief.glance.threatNarrative },
    ],
    evidence: brief.glance.evidence,
    edges: allEdges,
  });
  const glanceUsable =
    glanceVerdict.keep && !isBlank(brief.glance.headline) && !isBlank(brief.glance.threatNarrative);
  let glance: ExecutiveBrief['glance'];
  if (glanceUsable) {
    glance = { ...brief.glance, evidence: glanceVerdict.validEvidence };
    flagAt('glance.headline', glanceVerdict, 'headline');
    flagAt('glance.threatNarrative', glanceVerdict, 'threatNarrative');
  } else {
    if (glanceVerdict.keep) {
      // Kept by the shared rules but there is nothing to show.
      droppedClaims += 2;
    }
    // Never blank the glance: fall back to the deterministic template glance and say so.
    glance = buildTemplateGlance(snapshot, mode);
    const reason = 'fallback';
    addFlag({
      claimPath: 'glance.headline',
      statement: glance.headline,
      reason,
    });
    addFlag({
      claimPath: 'glance.threatNarrative',
      statement: glance.threatNarrative,
      reason,
    });
  }

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
      fields: [
        { key: 'title', text: storyline.title, required: true },
        { key: 'narrative', text: storyline.narrative, required: true },
        { key: 'whyItMatters', text: storyline.whyItMatters },
      ],
      evidence: storyline.evidence,
      edges: storyEdges,
    });
    if (verdict.keep) {
      const path = `storylines[${storylines.length}]`;
      storylines.push({ ...storyline, evidence: verdict.validEvidence });
      ['title', 'narrative', 'whyItMatters'].forEach((key) =>
        flagAt(`${path}.${key}`, verdict, key)
      );
    }
  });

  let crossStorylineConclusion: ExecutiveBrief['crossStorylineConclusion'];
  if (brief.crossStorylineConclusion) {
    const { statement, confidence, evidence } = brief.crossStorylineConclusion;
    const verdict = evaluate({
      claimCount: 1,
      fields: [{ key: 'statement', text: statement, required: true }],
      evidence,
      edges: allEdges,
    });
    if (verdict.keep) {
      crossStorylineConclusion = { statement, confidence, evidence: verdict.validEvidence };
      flagAt('crossStorylineConclusion.statement', verdict);
    }
  }

  const blindSpotsVerdict = evaluate({
    claimCount: 1,
    fields: [{ key: 'summary', text: brief.blindSpots.summary }],
    evidence: brief.blindSpots.evidence,
    edges: allEdges,
  });
  const blindSpots: ExecutiveBrief['blindSpots'] = blindSpotsVerdict.keep
    ? { summary: brief.blindSpots.summary, evidence: blindSpotsVerdict.validEvidence }
    : { summary: '', evidence: blindSpotsVerdict.validEvidence };
  if (blindSpotsVerdict.keep) {
    flagAt('blindSpots.summary', blindSpotsVerdict);
  }

  const decisions: ExecutiveBriefDecision[] = [];
  brief.decisions.forEach((decision) => {
    const relatesToValid = hasOwn(catalog, decision.relatesTo) && isRelatable(decision.relatesTo);
    if (!relatesToValid) {
      invalidIds.add(decision.relatesTo);
    }
    const verdict = evaluate({
      claimCount: 1,
      fields: [
        { key: 'action', text: decision.action, required: true },
        { key: 'rationale', text: decision.rationale },
      ],
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
    const path = `decisions[${decisions.length}]`;
    decisions.push({ ...decision, evidence: verdict.validEvidence, targets });
    flagAt(path, verdict);
    if (decision.owner === undefined) {
      addFlag({ claimPath: path, statement: decision.action, reason: 'missing_owner' });
    }
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
      ...(flags.length > 0 ? { flags } : {}),
    },
  };
};
