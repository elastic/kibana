/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AssessmentKey,
  AttentionLevel,
} from '../../../../../common/entity_analytics/executive_brief/brief';
import type { Fact } from '../../../../../common/entity_analytics/executive_brief/evidence';
import type { EvidenceIndex } from './evidence_index';
import { citedFacts } from './evidence_index';
import type { BriefCheck, CheckOutcome } from './types';
import {
  assessmentPath,
  emptyOutcome,
  keptAssessments,
  mapAssessments,
  verdictFactIds,
} from './types';

const LEVEL_RANK: Record<AttentionLevel, number> = { clear: 0, watch: 1, action: 2, urgent: 3 };

const higher = (a: AttentionLevel, b: AttentionLevel): AttentionLevel =>
  LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;

const HANDLED_STATUS = /^(?:acknowledged|closed|in[-_ ]progress|resolved)$/i;

/**
 * A fact is being handled when its own status says so (e.g. an acknowledged discovery) or when a
 * case covers one of its entities.
 */
export const isAddressed = (fact: Fact, index: EvidenceIndex): boolean => {
  const status = fact.details?.status;
  if (status && HANDLED_STATUS.test(status)) {
    return true;
  }
  return index.evidence.facts.some(
    (other) =>
      other.source?.type === 'case' &&
      other.entityIds.some((entityId) => fact.entityIds.includes(entityId))
  );
};

/** Critical or high attack discoveries that nobody is handling. */
const unaddressedSevereDiscoveries = (index: EvidenceIndex): Fact[] =>
  index.evidence.facts.filter(
    (fact) =>
      fact.source?.type === 'attack_discovery' &&
      (fact.severity === 'critical' || fact.severity === 'high') &&
      !isAddressed(fact, index)
  );

/**
 * The highest level a fact supports: `urgent` needs an unaddressed critical or high fact; a handled
 * one, a medium one or an unrated one supports `action`; a low one supports `watch`.
 */
const supportOf = (fact: Fact, index: EvidenceIndex): AttentionLevel => {
  switch (fact.severity) {
    case 'critical':
    case 'high':
      return isAddressed(fact, index) ? 'action' : 'urgent';
    case 'low':
      return 'watch';
    default:
      return 'action';
  }
};

/** The highest level the cited facts support; `clear` with none. */
export const supportedLevel = (index: EvidenceIndex, factIds: readonly number[]): AttentionLevel =>
  citedFacts(index, factIds).reduce<AttentionLevel>(
    (level, fact) => higher(level, supportOf(fact, index)),
    'clear'
  );

/**
 * Guardrails: small deterministic bounds on the AI's judgement.
 * - Ceiling: a level never exceeds what its cited facts support (the verdict: what its kept
 *   assessments cite, so a verdict without them is `clear`); higher levels are lowered, so little
 *   evidence can't read as an emergency.
 * - Floors: the verdict is never `clear` while an unaddressed critical/high attack discovery exists,
 *   and never calmer than its most severe assessment. These are structural (the model gets one
 *   chance to fix them).
 */
export const checkGuardrails: BriefCheck = (brief, context): CheckOutcome => {
  const { index, dropped } = context;
  const outcome = emptyOutcome(brief);
  const isKept = (key: AssessmentKey): boolean => !dropped.has(assessmentPath(key));

  const cap = (path: string, level: AttentionLevel, factIds: readonly number[]): AttentionLevel => {
    const ceiling = supportedLevel(index, factIds);
    if (LEVEL_RANK[level] <= LEVEL_RANK[ceiling]) {
      return level;
    }
    outcome.lowered += 1;
    outcome.notes.push(`lowered ${path} from "${level}" to "${ceiling}" (cited evidence)`);
    return ceiling;
  };

  const assessments = mapAssessments(brief.assessments, (assessment, key) =>
    isKept(key)
      ? {
          ...assessment,
          level: cap(`${assessmentPath(key)}.level`, assessment.level, assessment.factIds),
        }
      : assessment
  );
  const kept = keptAssessments(assessments, dropped);
  const verdict = {
    ...brief.verdict,
    level: cap('verdict.level', brief.verdict.level, verdictFactIds(assessments, dropped)),
  };
  outcome.brief = { verdict, assessments };

  const discoveries = unaddressedSevereDiscoveries(index);
  if (verdict.level === 'clear' && discoveries.length > 0) {
    outcome.structuralErrors.push(
      `verdict.level: cannot be "clear" while unaddressed critical or high attack discoveries exist (fact ids ${discoveries
        .map(({ id }) => id)
        .join(', ')}).`
    );
  }

  const worstAssessment = kept.reduce<AttentionLevel | undefined>(
    (worst, { level }) =>
      worst === undefined || LEVEL_RANK[level] > LEVEL_RANK[worst] ? level : worst,
    undefined
  );
  if (worstAssessment !== undefined && LEVEL_RANK[verdict.level] < LEVEL_RANK[worstAssessment]) {
    outcome.structuralErrors.push(
      `verdict.level: "${verdict.level}" is lower than the most severe assessment ("${worstAssessment}"); the verdict must be at least as severe as every assessment.`
    );
  }
  return outcome;
};
