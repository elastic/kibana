/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface TimedEvent {
  kind: string;
  at: string;
  title: string;
}

const time = (event: TimedEvent): number => Date.parse(event.at);

/**
 * The events that put a root cause after customer impact, which cannot be: a cause comes first. It
 * only counts when every root cause is later than the first customer impact; one that is not later
 * means the record has a cause that came first (a second, later one is another problem). The same
 * time is allowed: the data often only says which bucket both fell in.
 */
export const findCauseAfterImpact = (
  events: readonly TimedEvent[] | undefined
): { cause: TimedEvent; impact: TimedEvent } | undefined => {
  const valid = (events ?? []).filter((event) => !Number.isNaN(time(event)));
  const causes = valid.filter(({ kind }) => kind === 'root_cause');
  const impacts = valid.filter(({ kind }) => kind === 'customer_impact');
  if (causes.length === 0 || impacts.length === 0) {
    return undefined;
  }
  const firstImpact = impacts.reduce((a, b) => (time(b) < time(a) ? b : a));
  const firstCause = causes.reduce((a, b) => (time(b) < time(a) ? b : a));
  return time(firstCause) > time(firstImpact)
    ? { cause: firstCause, impact: firstImpact }
    : undefined;
};

/** What to tell the model when its record puts the root cause after the customer impact. */
export const causeAfterImpactRequest = (found: { cause: TimedEvent; impact: TimedEvent }): string =>
  `The record puts the root cause after the customer impact, which cannot be: a cause comes first. Root cause "${found.cause.title}" is at ${found.cause.at}; customer impact "${found.impact.title}" is at ${found.impact.at}. Answer again with the same record and fix the times from the data: the root cause is the moment the cause took effect (a deploy, a pod start, a config change), and the customer impact is the first failing request, log line or span, not the start of the bucket a query grouped by. If the cause really came after the impact, it is not the cause of that impact: name the real cause.`;
