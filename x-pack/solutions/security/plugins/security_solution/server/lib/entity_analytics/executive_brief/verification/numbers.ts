/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { getEntityRisk } from '../../../../../common/entity_analytics/executive_brief/entity_risk';
import type { AssessmentKey } from '../../../../../common/entity_analytics/executive_brief/brief';
import { MENTION_PATTERN } from './mentions';
import type { CheckContext } from './verify';

const NUMBER_PATTERN = /\d+(?:,\d{3})*(?:\.\d+)?/g;

const MONTH =
  '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\b\\.?';

/** Spans whose digits are identifiers or times, not quantities; blanked in order before numbers are read. */
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
  // Mention tokens, MITRE ids, and identifiers with digits attached to letters (host-01, S3, TA0001)
  MENTION_PATTERN,
  /\bT(?:A)?\d{4}(?:\.\d{3})?\b/g,
  /\b[A-Za-z][\w.-]*?\d[\w.-]*\b/g,
];

/** The numbers written in `text`, as written (e.g. "1,204"), ignoring the evidence's identifiers. */
const findNumbers = (text: string, { identifierPattern }: CheckContext): string[] =>
  MASKS.reduce(
    (masked, pattern) => masked.replace(pattern, ' '),
    identifierPattern ? text.replace(identifierPattern, ' ') : text
  ).match(NUMBER_PATTERN) ?? [];

const toValue = (token: string): number => Number(token.replace(/,/g, ''));

/** A value and the ways it may be written: rounded, one decimal, a share as a percentage. */
const variants = (value: number): number[] => {
  const abs = Math.abs(value);
  const written = [abs, Math.round(abs), Math.round(abs * 10) / 10];
  if (abs > 0 && abs <= 1) {
    written.push(Math.round(abs * 100));
  }
  return written;
};

/** What a claim may quote: its cited facts' numbers, its entities' risk scores, counts of both, and the window. */
const allowedNumbers = (texts: string[], factIds: number[], context: CheckContext): Set<number> => {
  const facts = context.citedFacts(factIds);
  const euids = uniq([
    ...[...context.entities.keys()].filter((euid) => texts.some((text) => text.includes(euid))),
    ...facts.flatMap(({ entityIds }) => entityIds),
  ]).filter((euid) => context.entities.has(euid));
  const values = [
    ...facts.flatMap((fact) => [
      ...Object.values(fact.numbers ?? {}),
      ...[fact.title, ...Object.values(fact.details ?? {})].flatMap((text) =>
        findNumbers(text, context).map(toValue)
      ),
    ]),
    ...euids.flatMap((euid) => {
      const record = context.entities.get(euid);
      return (record && getEntityRisk(record)?.score) ?? [];
    }),
    euids.length,
    facts.length,
    ...findNumbers(context.range ?? '', context).map(toValue),
  ];
  return new Set(values.filter(Number.isFinite).flatMap(variants));
};

/** Fails a claim whose prose has a number that isn't in what it cites (the verdict: what its assessments cite). */
export const checkNumbers = (context: CheckContext): void => {
  const check = (
    key: AssessmentKey | undefined,
    fields: Record<string, string>,
    factIds: number[]
  ) => {
    const allowed = allowedNumbers(Object.values(fields), factIds, context);
    const unsupported = Object.entries(fields).flatMap(([path, text]) =>
      findNumbers(text, context)
        .filter((token) => !allowed.has(toValue(token)))
        .map((token) => `${path}: "${token}"`)
    );
    if (unsupported.length > 0) {
      const tokens = uniq(unsupported).join(', ');
      context.fail(key, 'number', `numbers not found in the facts or entities it cites: ${tokens}`);
    }
  };

  const { headline, summary } = context.brief.verdict;
  const verdictFields = { 'verdict.headline': headline, 'verdict.summary': summary };
  check(undefined, verdictFields, context.verdictFactIds());
  for (const [key, assessment] of context.assessments()) {
    check(key, { [`assessments.${key}.summary`]: assessment.summary }, assessment.factIds);
  }
};
