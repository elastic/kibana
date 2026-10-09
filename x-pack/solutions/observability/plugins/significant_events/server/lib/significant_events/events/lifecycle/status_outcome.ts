/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** What the verdicts of an event's members add up to, or what one member's verdict says. */
export type StatusOutcome = 'breaching' | 'clean' | 'no_data';

/**
 * An event recovers only when every member is verifiably healthy: any breaching member keeps it
 * breaching, and otherwise any member we could not judge keeps the status where it is. An event
 * with no judgeable members cannot be assessed at all.
 */
export const aggregateStatusOutcomes = (outcomes: readonly StatusOutcome[]): StatusOutcome => {
  if (outcomes.includes('breaching')) {
    return 'breaching';
  }
  if (outcomes.length === 0 || outcomes.includes('no_data')) {
    return 'no_data';
  }
  return 'clean';
};
