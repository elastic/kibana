/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Fact } from '../../../../../common/entity_analytics/executive_brief/evidence';
import type { EvidenceIndex } from './evidence_index';
import { citedFacts, isEntityId, isFactId, unique } from './evidence_index';
import type { BriefCheck, CheckOutcome, Claim } from './types';
import { emptyOutcome, isDropped, listClaims } from './types';

const NUMBER_PATTERN = /\d+(?:,\d{3})*(?:\.\d+)?/g;

const MONTH =
  '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\b\\.?';

/**
 * Spans whose digits are identifiers or times, not quantities. Applied in order; each match is
 * blanked before numbers are read.
 */
const MASKS: readonly RegExp[] = [
  // UUIDs
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  // ISO dates and timestamps
  /\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?(?!\d)/g,
  // Month-name dates: "Oct 7", "October 7th, 2026", "7 October 2026"
  new RegExp(`\\b${MONTH}\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?\\b`, 'gi'),
  new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTH}(?:,?\\s+\\d{4})?\\b`, 'gi'),
  // Clock times: "08:31", "8:31:18", "9 am", "10pm"
  /\b\d{1,2}:\d{2}(?::\d{2})?\b/g,
  /\b\d{1,2}\s?(?:am|pm)\b/gi,
  // Years
  /\b(?:19|20)\d{2}\b/g,
  // IPv4 addresses
  /\b\d{1,3}(?:\.\d{1,3}){3}\b/g,
  // Ordinals: "1st", "2nd", "23rd", "4th"
  /\b\d+(?:st|nd|rd|th)\b/gi,
  // Evidence ids, MITRE ids, and identifiers with digits attached to letters (host-01, S3, TA0001)
  /(?<![\w-])(?:ENT|F|L)-\d+(?![\w-])/g,
  /\bT(?:A)?\d{4}(?:\.\d{3})?\b/g,
  /\b[A-Za-z][\w.-]*?\d[\w.-]*\b/g,
];

/** Blanks every span that is not a quantity. */
export const maskNonQuantities = (text: string): string =>
  MASKS.reduce((masked, pattern) => masked.replace(pattern, ' '), text);

/** The numbers written in `text`, as written (e.g. "1,204"). */
export const findNumbers = (text: string): string[] =>
  maskNonQuantities(text).match(NUMBER_PATTERN) ?? [];

const toValue = (token: string): number => Number(token.replace(/,/g, ''));

/** Adds a value and the ways it may be written: rounded, one decimal, a share as a percentage. */
const addNumber = (allowed: Set<number>, value: number): void => {
  if (!Number.isFinite(value)) {
    return;
  }
  const abs = Math.abs(value);
  allowed.add(abs);
  allowed.add(Math.round(abs));
  allowed.add(Math.round(abs * 10) / 10);
  if (abs > 0 && abs <= 1) {
    allowed.add(Math.round(abs * 100));
  }
};

const addFactNumbers = (allowed: Set<number>, fact: Fact): void => {
  Object.values(fact.numbers ?? {}).forEach((value) => addNumber(allowed, value));
  // Deterministic text written by the signal may carry numbers too.
  [fact.title, ...Object.values(fact.details ?? {})].forEach((text) =>
    findNumbers(text).forEach((token) => addNumber(allowed, toValue(token)))
  );
};

const addEntityNumbers = (allowed: Set<number>, index: EvidenceIndex, id: string): void => {
  const entity = index.entities.get(id);
  if (entity?.riskScore !== undefined) {
    addNumber(allowed, entity.riskScore);
  }
  if (entity?.aliasCount !== undefined) {
    addNumber(allowed, entity.aliasCount);
  }
};

/** Numbers that hold for the whole brief: the window length. */
const addGlobalNumbers = (allowed: Set<number>, range: string | undefined): void => {
  findNumbers(range ?? '').forEach((token) => addNumber(allowed, toValue(token)));
};

/** Every number present anywhere in the evidence, to tell a miscited number from an invented one. */
export const collectEvidenceNumbers = (index: EvidenceIndex, range?: string): Set<number> => {
  const allowed = new Set<number>();
  index.facts.forEach((fact) => addFactNumbers(allowed, fact));
  index.entities.forEach((_entity, id) => addEntityNumbers(allowed, index, id));
  const { facts, links, signals } = index.evidence;
  [index.entities.size, facts.length, links.length].forEach((n) => addNumber(allowed, n));
  signals.forEach(({ factCount, linkCount }) => {
    addNumber(allowed, factCount);
    addNumber(allowed, linkCount);
  });
  const perKind = new Map<string, number>();
  facts.forEach(({ kind }) => perKind.set(kind, (perKind.get(kind) ?? 0) + 1));
  perKind.forEach((count) => addNumber(allowed, count));
  addGlobalNumbers(allowed, range);
  return allowed;
};

/**
 * The numbers a claim may quote: those of the facts it cites (directly or through a cited link),
 * the risk scores of the entities it cites, simple counts of what it cites, and the window length.
 */
export const collectClaimNumbers = (
  claim: Claim,
  index: EvidenceIndex,
  threatCount: number,
  range?: string
): Set<number> => {
  const allowed = new Set<number>();
  citedFacts(index, claim.evidence).forEach((fact) => addFactNumbers(allowed, fact));
  const entities = unique([...claim.entities, ...claim.evidence.filter(isEntityId)]);
  entities.forEach((id) => addEntityNumbers(allowed, index, id));
  [entities.length, claim.evidence.filter(isFactId).length, threatCount].forEach((n) =>
    addNumber(allowed, n)
  );
  addGlobalNumbers(allowed, range);
  return allowed;
};

/**
 * Numbers: every number in a claim's prose must come from the evidence it cites. A number found
 * nowhere in the evidence is invented and drops the claim (structural for the verdict). A number
 * that exists in the evidence but not in what the claim cites is flagged as miscited.
 * Dates, times, ids, ordinals and identifiers are masked first.
 */
export const createNumbersCheck =
  (range?: string): BriefCheck =>
  (brief, context): CheckOutcome => {
    const { index } = context;
    const outcome = emptyOutcome(brief);
    const everywhere = collectEvidenceNumbers(index, range);

    listClaims(brief).forEach((claim) => {
      if (isDropped(context, claim.path)) {
        return;
      }
      const allowed = collectClaimNumbers(claim, index, brief.threats.length, range);
      const invented: string[] = [];
      claim.fields.forEach(({ path, text }) => {
        findNumbers(text).forEach((token) => {
          const value = toValue(token);
          if (allowed.has(value)) {
            return;
          }
          if (everywhere.has(value)) {
            outcome.flags.push({
              path,
              check: 'number',
              message: `"${token}" is in the evidence but not in the facts this claim cites`,
            });
          } else {
            invented.push(`${path}: "${token}"`);
          }
        });
      });
      if (invented.length === 0) {
        return;
      }
      const reason = `numbers not found in the evidence: ${unique(invented).join(', ')}`;
      if (claim.path === undefined) {
        outcome.structuralErrors.push(
          `verdict: ${reason}. Only quote numbers from the cited facts.`
        );
      } else {
        outcome.drops.push({ path: claim.path, check: 'number', reason });
      }
    });
    return outcome;
  };
