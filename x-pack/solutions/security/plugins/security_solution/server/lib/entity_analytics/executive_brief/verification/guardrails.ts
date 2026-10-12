/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttentionLevel } from '../../../../../common/entity_analytics/executive_brief/brief';
import type { Fact } from '../../../../../common/entity_analytics/executive_brief/evidence';
import type { EvidenceIndex } from './evidence_index';
import type { BriefCheck, CheckOutcome, ItemPath } from './types';
import { emptyOutcome } from './types';

const LEVEL_RANK: Record<AttentionLevel, number> = { clear: 0, watch: 1, action: 2, urgent: 3 };

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
      other.kind === 'case' && other.entities.some((entity) => fact.entities.includes(entity))
  );
};

/** Critical or high attack discoveries that nobody is handling. */
export const unaddressedSevereDiscoveries = (index: EvidenceIndex): Fact[] =>
  index.evidence.facts.filter(
    (fact) =>
      fact.kind === 'attack_discovery' &&
      (fact.severity === 'critical' || fact.severity === 'high') &&
      !isAddressed(fact, index)
  );

/**
 * Guardrails: small deterministic floors on the AI's judgement. Verdict violations are structural
 * (the model gets one chance to fix them); duplicate areas are dropped.
 * - The verdict is never `clear` while an unaddressed critical/high attack discovery exists.
 * - The verdict is never calmer than its most severe area.
 */
export const checkGuardrails: BriefCheck = (brief, context): CheckOutcome => {
  const { index, dropped } = context;
  const outcome = emptyOutcome(brief);
  const { verdict } = brief;

  const seenAreas = new Set<string>();
  const keptAreas = brief.areas.filter((area, i) => {
    const path: ItemPath = `areas[${i}]`;
    if (dropped.has(path)) {
      return false;
    }
    if (seenAreas.has(area.id)) {
      outcome.drops.push({ path, check: 'guardrail', reason: `duplicate "${area.id}" area` });
      return false;
    }
    seenAreas.add(area.id);
    return true;
  });

  const discoveries = unaddressedSevereDiscoveries(index);
  if (verdict.level === 'clear' && discoveries.length > 0) {
    outcome.structuralErrors.push(
      `verdict.level: cannot be "clear" while unaddressed critical or high attack discoveries exist (${discoveries
        .map(({ id }) => id)
        .join(', ')}).`
    );
  }

  const worstArea = keptAreas.reduce<AttentionLevel | undefined>(
    (worst, { level }) =>
      worst === undefined || LEVEL_RANK[level] > LEVEL_RANK[worst] ? level : worst,
    undefined
  );
  if (worstArea !== undefined && LEVEL_RANK[verdict.level] < LEVEL_RANK[worstArea]) {
    outcome.structuralErrors.push(
      `verdict.level: "${verdict.level}" is lower than the most severe area ("${worstArea}"); the verdict must be at least as severe as every area.`
    );
  }
  return outcome;
};
