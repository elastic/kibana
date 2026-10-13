/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { getEntityRisk } from '../../../../../common/entity_analytics/executive_brief/entity_risk';
import type { AssessmentKey } from '../../../../../common/entity_analytics/executive_brief/brief';
import type { BriefCheck, CheckContext } from './context';
import { assessmentsOf, citedFacts, failClaim, verdictFactIds } from './context';
import { MENTION_PATTERN } from './mentions';

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
  return [
    abs,
    Math.round(abs),
    Math.round(abs * 10) / 10,
    ...(abs > 0 && abs <= 1 ? [Math.round(abs * 100)] : []),
  ];
};

/**
 * The numbers a claim may quote: those of the facts it cites (including numbers in their titles
 * and details), the risk scores of the entities it names or cites, simple counts of what it cites,
 * and the window length.
 */
const allowedNumbers = (texts: string[], factIds: number[], context: CheckContext): Set<number> => {
  const facts = citedFacts(context, factIds);
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

/**
 * Numbers: every number in a claim's prose must come from what the claim cites (the verdict: what
 * its assessments cite), even when it appears elsewhere in the evidence. Otherwise an assessment is
 * dropped, or the verdict gets a structural error. Dates, times, ordinals, identifiers, mention
 * tokens and the evidence's entity ids and names are masked first.
 */
export const checkNumbers: BriefCheck = (brief, context) => {
  const claims: Array<{ key?: AssessmentKey; fields: Record<string, string>; factIds: number[] }> =
    [
      {
        fields: {
          'verdict.headline': brief.verdict.headline,
          'verdict.summary': brief.verdict.summary,
        },
        factIds: verdictFactIds(brief, context),
      },
      ...assessmentsOf(brief.assessments)
        .filter(([key]) => !context.dropped.has(key))
        .map(([key, { summary, factIds }]) => ({
          key,
          fields: { [`assessments.${key}.summary`]: summary },
          factIds,
        })),
    ];
  claims.forEach(({ key, fields, factIds }) => {
    const allowed = allowedNumbers(Object.values(fields), factIds, context);
    const unsupported = Object.entries(fields).flatMap(([path, text]) =>
      findNumbers(text, context)
        .filter((token) => !allowed.has(toValue(token)))
        .map((token) => `${path}: "${token}"`)
    );
    if (unsupported.length > 0) {
      failClaim(
        context,
        key,
        'number',
        `numbers not found in the facts or entities it cites: ${uniq(unsupported).join(', ')}`
      );
    }
  });
  return brief;
};
