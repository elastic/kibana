/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Brief,
  VerificationCheck,
  VerificationFlag,
  VerificationSummary,
} from '../../../../../common/entity_analytics/executive_brief/brief';
import type { Evidence } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { checkCitations } from './citations';
import { checkConnectivity } from './connectivity';
import { buildEvidenceIndex } from './evidence_index';
import { checkGuardrails } from './guardrails';
import { createNumbersCheck } from './numbers';
import { checkRelations } from './relations';
import type { BriefCheck, ItemDrop, ItemPath } from './types';

export interface VerifyBriefOptions {
  /** The window label (e.g. "7d"); its number may be quoted. */
  range?: string;
}

export interface VerifyBriefResult {
  /** The brief with unknown ids removed and failing items dropped. */
  brief: Brief;
  summary: Omit<VerificationSummary, 'repaired'>;
  /** Problems only the model can fix; non-empty means the brief is not usable as is. */
  structuralErrors: string[];
  /** Why items were dropped, and other clean-ups, for debug logging. */
  notes: string[];
}

const ITEM_PATH_PATTERN = /^(areas|threats|actions)\[(\d+)\]/;

/** Maps each kept item's old index to its new one. */
const keptIndexes = (
  count: number,
  kind: string,
  dropped: ReadonlyMap<string, ItemDrop>
): Map<number, number> => {
  const mapping = new Map<number, number>();
  for (let i = 0; i < count; i++) {
    if (!dropped.has(`${kind}[${i}]`)) {
      mapping.set(i, mapping.size);
    }
  }
  return mapping;
};

/**
 * Verifies an AI-written brief against the evidence it was written from. Checks run in order
 * (citations, numbers, relations, connectivity, guardrails); each sees the previous one's clean-ups
 * and skips items already marked for removal. Failing items are dropped at the end, action→threat
 * references and flag paths are renumbered, and structural problems are returned for repair.
 */
export const verifyBrief = (
  input: Brief,
  evidence: Evidence,
  options: VerifyBriefOptions = {}
): VerifyBriefResult => {
  const index = buildEvidenceIndex(evidence);
  const checks: BriefCheck[] = [
    checkCitations,
    createNumbersCheck(options.range),
    checkRelations,
    checkConnectivity,
    checkGuardrails,
  ];

  const dropped = new Map<string, ItemDrop>();
  const flags: VerificationFlag[] = [];
  const structuralErrors: string[] = [];
  const notes: string[] = [];
  let brief = input;

  checks.forEach((check) => {
    const outcome = check(brief, { index, dropped: new Set(dropped.keys()) });
    brief = outcome.brief;
    outcome.drops.forEach((drop) => {
      if (!dropped.has(drop.path)) {
        dropped.set(drop.path, drop);
        notes.push(`dropped ${drop.path} (${drop.check}): ${drop.reason}`);
      }
    });
    flags.push(...outcome.flags);
    structuralErrors.push(...outcome.structuralErrors);
    notes.push(...outcome.notes);
  });

  // Threats were proposed but none survived: the model has to recompose them.
  const threatDrops = brief.threats.map((_threat, i) => dropped.get(`threats[${i}]`));
  if (threatDrops.length > 0 && threatDrops.every((drop) => drop !== undefined)) {
    structuralErrors.push(
      `threats: none of the ${threatDrops.length} threats passed verification (${threatDrops
        .map((drop) => (drop ? `${drop.path}: ${drop.reason}` : ''))
        .join('; ')}).`
    );
  }

  const threatIndexes = keptIndexes(brief.threats.length, 'threats', dropped);
  const indexesByKind: Record<string, Map<number, number>> = {
    areas: keptIndexes(brief.areas.length, 'areas', dropped),
    threats: threatIndexes,
    actions: keptIndexes(brief.actions.length, 'actions', dropped),
  };
  const isKept = (path: ItemPath): boolean => !dropped.has(path);

  const cleaned: Brief = {
    verdict: brief.verdict,
    areas: brief.areas.filter((_area, i) => isKept(`areas[${i}]`)),
    threats: brief.threats.filter((_threat, i) => isKept(`threats[${i}]`)),
    actions: brief.actions
      .filter((_action, i) => isKept(`actions[${i}]`))
      .map(({ threat, ...action }) => {
        const renumbered = threat === undefined ? undefined : threatIndexes.get(threat - 1);
        return renumbered === undefined ? action : { ...action, threat: renumbered + 1 };
      }),
  };

  const seen = new Set<string>();
  const remappedFlags = flags.flatMap((flag): VerificationFlag[] => {
    const match = ITEM_PATH_PATTERN.exec(flag.path);
    let { path } = flag;
    if (match) {
      const [whole, kind, position] = match;
      const next = indexesByKind[kind]?.get(Number(position));
      if (next === undefined) {
        return [];
      }
      path = `${kind}[${next}]${flag.path.slice(whole.length)}`;
    }
    const key = `${path}\u0000${flag.check}\u0000${flag.message}`;
    if (seen.has(key)) {
      return [];
    }
    seen.add(key);
    return [{ ...flag, path }];
  });

  const droppedCounts: Partial<Record<VerificationCheck, number>> = {};
  dropped.forEach(({ check }) => {
    droppedCounts[check] = (droppedCounts[check] ?? 0) + 1;
  });

  return {
    brief: cleaned,
    summary: { dropped: droppedCounts, flags: remappedFlags },
    structuralErrors,
    notes,
  };
};
