/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHuntEligibleIoc } from '@kbn/alertzero-common';
import type { Evaluator } from '@kbn/evals';
import type { ReviewIocsExample, ReviewIocsResponse, ReviewedIoc } from '../types';

const emailsIn = (output: ReviewIocsResponse | undefined): ReviewedIoc[] =>
  (output?.iocs ?? []).filter((ioc) => ioc.type === 'email');

const findEmail = (output: ReviewIocsResponse | undefined, value: string) =>
  emailsIn(output).find((ioc) => ioc.value.toLowerCase() === value.toLowerCase());

/** "Hunted" means a hunt would search it: the same predicate Hunt Watch applies to a report. */
const isHunted = (ioc: ReviewedIoc | undefined): boolean =>
  ioc !== undefined && isHuntEligibleIoc(ioc);

const share = (hits: number, total: number): number | null => (total === 0 ? null : hits / total);

/**
 * CODE evaluator: of the plain-prose addresses the source does not attribute to the attacker
 * (a publisher's contact line, a researcher credit, a victim), the share that is not hunted.
 * Null for a row with none. A model that approves everything fails this.
 */
export const createEmailNotHuntedEvaluator = (): Evaluator<
  ReviewIocsExample,
  ReviewIocsResponse
> => ({
  name: 'email-not-hunted',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const labelled = (expected?.emails ?? []).filter(
      (email) => email.decidedBy === 'model' && !email.hunted
    );
    const notHunted = labelled.filter((email) => !isHunted(findEmail(output, email.value)));
    return { score: share(notHunted.length, labelled.length) };
  },
});

/**
 * CODE evaluator: of the addresses the source attributes to the attacker, the share that is
 * hunted. Null for a row with none. A model that approves nothing fails this.
 */
export const createEmailHuntedEvaluator = (): Evaluator<ReviewIocsExample, ReviewIocsResponse> => ({
  name: 'email-hunted',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const labelled = (expected?.emails ?? []).filter((email) => email.hunted);
    const hunted = labelled.filter((email) => isHunted(findEmail(output, email.value)));
    return { score: share(hunted.length, labelled.length) };
  },
});

/**
 * CODE evaluator: 0 when the response holds a hunt-eligible email the row did not label as
 * hunted, else 1. Catches an address the labels did not anticipate being hunted.
 */
export const createEmailUnlabelledEvaluator = (): Evaluator<
  ReviewIocsExample,
  ReviewIocsResponse
> => ({
  name: 'email-unlabelled',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const allowed = new Set(
      (expected?.emails ?? []).filter((email) => email.hunted).map((e) => e.value.toLowerCase())
    );
    const unlabelled = emailsIn(output).filter(
      (ioc) => isHuntEligibleIoc(ioc) && !allowed.has(ioc.value.toLowerCase())
    );
    return {
      score: unlabelled.length === 0 ? 1 : 0,
      ...(unlabelled.length > 0 ? { label: unlabelled.map((ioc) => ioc.value).join(', ') } : {}),
    };
  },
});
