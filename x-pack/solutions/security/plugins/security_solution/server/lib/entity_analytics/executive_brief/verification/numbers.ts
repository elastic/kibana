/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntityRisk } from '../../../../../common/entity_analytics/executive_brief/entity_risk';
import type { Fact } from '../../../../../common/entity_analytics/executive_brief/evidence';
import type { EvidenceIndex } from './evidence_index';
import { citedFacts, EVIDENCE_ID_PATTERN, unique } from './evidence_index';
import type { BriefCheck, CheckOutcome, Claim } from './types';
import { emptyOutcome, isDropped, listClaims, reportClaim } from './types';

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
  EVIDENCE_ID_PATTERN,
  /\bT(?:A)?\d{4}(?:\.\d{3})?\b/g,
  /\b[A-Za-z][\w.-]*?\d[\w.-]*\b/g,
];

/** Blanks every span that is not a quantity. */
export const maskNonQuantities = (text: string): string =>
  MASKS.reduce((masked, pattern) => masked.replace(pattern, ' '), text);

/** The numbers written in `text`, as written (e.g. "1,204"), ignoring the given identifiers. */
const findNumbers = (text: string, identifierPattern?: RegExp): string[] =>
  maskNonQuantities(identifierPattern ? text.replace(identifierPattern, ' ') : text).match(
    NUMBER_PATTERN
  ) ?? [];

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

const addFactNumbers = (allowed: Set<number>, fact: Fact, index: EvidenceIndex): void => {
  Object.values(fact.numbers ?? {}).forEach((value) => addNumber(allowed, value));
  // Deterministic text written by the signal may carry numbers too.
  [fact.title, ...Object.values(fact.details ?? {})].forEach((text) =>
    findNumbers(text, index.identifierPattern).forEach((token) =>
      addNumber(allowed, toValue(token))
    )
  );
};

/** EUIDs of the entities a claim is about: named in its prose, or part of what it cites. */
const claimEntities = (claim: Claim, index: EvidenceIndex, facts: readonly Fact[]): string[] =>
  unique([
    ...[...index.entities.keys()].filter((euid) =>
      claim.fields.some(({ text }) => text.includes(euid))
    ),
    ...facts.flatMap(({ entities }) => entities),
    ...claim.evidence.flatMap((id) => {
      const link = index.links.get(id);
      return link ? [link.from, link.to] : [];
    }),
  ]).filter((euid) => index.entities.has(euid));

/**
 * The numbers a claim may quote: those of the facts it cites (directly or through a cited link),
 * the risk scores of the entities it is about, simple counts of what it cites, and the window
 * length.
 */
export const collectClaimNumbers = (
  claim: Claim,
  index: EvidenceIndex,
  range?: string
): Set<number> => {
  const allowed = new Set<number>();
  const facts = citedFacts(index, claim.evidence);
  facts.forEach((fact) => addFactNumbers(allowed, fact, index));
  const entities = claimEntities(claim, index, facts);
  entities.forEach((euid) => {
    const record = index.entities.get(euid);
    const score = record && getEntityRisk(record)?.score;
    if (score !== undefined) {
      addNumber(allowed, score);
    }
  });
  [entities.length, facts.length].forEach((count) => addNumber(allowed, count));
  findNumbers(range ?? '').forEach((token) => addNumber(allowed, toValue(token)));
  return allowed;
};

/**
 * Numbers: every number in a claim's prose must come from what the claim cites. Any other number
 * drops the claim (structural for the verdict), even when it appears elsewhere in the evidence.
 * Dates, times, ids, ordinals, identifiers and the evidence's entity ids and names are masked
 * first.
 */
export const createNumbersCheck =
  (range?: string): BriefCheck =>
  (brief, context): CheckOutcome => {
    const { index } = context;
    const outcome = emptyOutcome(brief);

    listClaims(brief).forEach((claim) => {
      if (isDropped(context, claim.path)) {
        return;
      }
      const allowed = collectClaimNumbers(claim, index, range);
      const unsupported = claim.fields.flatMap(({ path, text }) =>
        findNumbers(text, index.identifierPattern)
          .filter((token) => !allowed.has(toValue(token)))
          .map((token) => `${path}: "${token}"`)
      );
      if (unsupported.length > 0) {
        reportClaim(
          outcome,
          claim,
          'number',
          `numbers not found in the facts or entities it cites: ${unique(unsupported).join(', ')}`
        );
      }
    });
    return outcome;
  };
