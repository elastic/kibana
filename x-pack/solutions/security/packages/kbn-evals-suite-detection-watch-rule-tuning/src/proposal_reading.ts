/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeType } from './constants';

/**
 * What an approval-gate assertion can read out of a settled review, or why this run has
 * nothing to measure.
 *
 * The approval arms assert on a *persisted query change*: the gate message renders
 * `proposed_query`, and `apply_query_tuning` interpolates the same string into its patch. That
 * makes `proposed_query` the only honest oracle for "was the proposal applied?". A run whose
 * review proposes a non-query branch (or proposes the rule's existing query verbatim) has no
 * such oracle, so the arm must report UNMEASURED — failing the suite would blame the suite for
 * a model/environment choice, and passing would claim a measurement that never happened.
 */
export type ProposalReading =
  | { measured: true; proposedQuery: string }
  | { measured: false; reason: string };

export interface ReviewProposalLike {
  change_type?: ChangeType | string;
  proposed_query?: string;
}

/**
 * Read the query an approval arm is about to assert on.
 *
 * @param proposal the gate's proposal (change_type + proposed_query)
 * @param fixtureId the fixture under test, named in the reason so a skip is attributable
 * @param currentQuery the rule's query before the run; a proposal equal to it is degenerate
 *   (an approval would be a no-op patch) and is returned as unmeasured too
 */
export const readProposal = (
  proposal: ReviewProposalLike,
  fixtureId: string,
  currentQuery?: string
): ProposalReading => {
  const changeType = proposal.change_type;
  const proposedQuery = proposal.proposed_query;

  if (changeType !== 'query' || !proposedQuery) {
    return {
      measured: false,
      reason:
        `The review proposed change_type=${String(changeType)}` +
        `${proposedQuery ? ` (proposed_query "${proposedQuery}")` : ''} for the ` +
        `"${fixtureId}" fixture, which is labelled "query". Both arms assert on a persisted ` +
        `query change, so this run measured nothing. Check that the fixture still drives the ` +
        `query path and that the run reached the gate for the seeded rule.`,
    };
  }

  if (currentQuery !== undefined && proposedQuery === currentQuery) {
    return {
      measured: false,
      reason:
        `The review proposed the rule's existing query verbatim ("${proposedQuery}"), so this ` +
        `arm cannot distinguish "not applied" from "applied" — the fixture or the run is ` +
        `degenerate, and a green assertion here would prove nothing.`,
    };
  }

  return { measured: true, proposedQuery };
};
