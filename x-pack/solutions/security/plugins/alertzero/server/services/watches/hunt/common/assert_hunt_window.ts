/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';

/** Bad caller input rather than a failure, so routes can answer 400 instead of 500. */
export class InvalidHuntWindowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidHuntWindowError';
  }
}

/**
 * Rejects a window that cannot contain an event. Elasticsearch answers a reversed
 * range with a successful zero-hit response, and a hunt has no way to tell that
 * apart from a clean environment — for a scheduled hunt-once run it is the clean
 * read that retires the report, so an empty window has to fail before the search
 * rather than after it.
 *
 * Both bounds resolve against one `now`, so `now-30d` and an absolute date are
 * compared on the same clock. A bound that is not valid date math is left to
 * Elasticsearch, which reports it precisely; only ordering is decided here.
 */
export const assertHuntWindow = ({ from, to }: { from: string; to: string }): void => {
  const forceNow = new Date();
  const parsedFrom = dateMath.parse(from, { forceNow });
  const parsedTo = dateMath.parse(to, { forceNow });
  if (!parsedFrom?.isValid() || !parsedTo?.isValid()) return;
  // `to` is exclusive, so an equal pair is empty too.
  if (parsedFrom.valueOf() < parsedTo.valueOf()) return;
  throw new InvalidHuntWindowError(
    `Hunt window is empty: from "${from}" is not before to "${to}". No event can fall inside ` +
      `it, so the search would report a clean environment it never looked at.`
  );
};
