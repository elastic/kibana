/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BriefSnapshot } from '../../../../../common/entity_analytics/executive_brief/types';
import { escapeRegExp } from './entity_mentions';
import type { EntityIndex } from './entity_mentions';

const NUMBER_PATTERN = /\d+(?:,\d{3})*(?:\.\d+)?/g;
const EVIDENCE_ID_PATTERN = /\b(?:ENT|RULE|AD|LEAD|CASE|ANOM|TAC|GAP|STORY|EVT)-[\w-]+/g;
const MITRE_ID_PATTERN = /\bT(?:A)?\d{4}(?:\.\d{3})?\b/g;

const parseNumbers = (text: string): number[] =>
  (text.match(NUMBER_PATTERN) ?? []).map((token) => Number(token.replace(/,/g, '')));

const addNumber = (allowed: Set<number>, value: number): void => {
  if (!Number.isFinite(value)) {
    return;
  }
  const abs = Math.abs(value);
  allowed.add(value);
  allowed.add(abs);
  allowed.add(Math.round(abs));
  allowed.add(Math.round(abs * 10) / 10);
  if (abs > 0 && abs <= 1) {
    // Shares (0.18) are written as percentages (18%).
    allowed.add(Math.round(abs * 100));
  }
};

const collectNumbers = (node: unknown, allowed: Set<number>): void => {
  if (typeof node === 'number') {
    addNumber(allowed, node);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item) => collectNumbers(item, allowed));
    return;
  }
  if (node !== null && typeof node === 'object') {
    Object.values(node).forEach((item) => collectNumbers(item, allowed));
  }
};

/**
 * Every number the prose is allowed to use: all numeric values anywhere in the snapshot, numbers
 * written in deterministic snapshot text (gap titles, event summaries), the time-range length,
 * and plain counts of snapshot collections.
 */
export const collectAllowedNumbers = (snapshot: BriefSnapshot): Set<number> => {
  const allowed = new Set<number>();
  collectNumbers(snapshot, allowed);

  snapshot.blindSpots.gaps.forEach((gap) => {
    parseNumbers(`${gap.title} ${gap.detail ?? ''}`).forEach((n) => addNumber(allowed, n));
  });
  snapshot.storylines.storylines.forEach((storyline) => {
    storyline.events.forEach((event) =>
      parseNumbers(event.summary).forEach((n) => addNumber(allowed, n))
    );
    [storyline.entityEuids, storyline.events, storyline.edges, storyline.seeds].forEach((list) =>
      addNumber(allowed, list.length)
    );
  });
  [
    snapshot.storylines.storylines,
    snapshot.blindSpots.gaps,
    snapshot.blindSpots.attackStages.stages,
    snapshot.glance.exposureLeaders,
    snapshot.glance.needsAttention,
  ].forEach((list) => addNumber(allowed, list.length));

  parseNumbers(snapshot.timeRange.range).forEach((n) => addNumber(allowed, n));
  return allowed;
};

/** Builds the regex that blanks out names, ids and titles whose digits are not "numbers". */
export const buildNumberMask = (
  snapshot: BriefSnapshot,
  index: EntityIndex
): RegExp | undefined => {
  const literals = new Set<string>(index.surfaceForms);
  Object.values(snapshot.catalog).forEach((entry) => {
    if ('name' in entry) {
      literals.add(entry.name.toLowerCase());
    }
    if ('title' in entry) {
      literals.add(entry.title.toLowerCase());
    }
  });
  const sorted = [...literals]
    .filter((literal) => literal.length > 0)
    .sort((a, b) => b.length - a.length);
  if (sorted.length === 0) {
    return undefined;
  }
  return new RegExp(sorted.map(escapeRegExp).join('|'), 'gi');
};

/** Returns the numbers written in `text` (as written, e.g. "57") that are not in `allowed`. */
export const findInventedNumbers = ({
  text,
  allowed,
  mask,
}: {
  text: string;
  allowed: Set<number>;
  mask?: RegExp;
}): string[] => {
  const masked = (mask ? text.replace(mask, ' ') : text)
    .replace(EVIDENCE_ID_PATTERN, ' ')
    .replace(MITRE_ID_PATTERN, ' ');
  const invented: string[] = [];
  for (const token of masked.match(NUMBER_PATTERN) ?? []) {
    if (!allowed.has(Number(token.replace(/,/g, '')))) {
      invented.push(token);
    }
  }
  return invented;
};
