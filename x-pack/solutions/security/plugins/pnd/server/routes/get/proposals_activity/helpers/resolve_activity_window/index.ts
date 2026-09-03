/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Milliseconds in one bucket of the sparkline series. */
export const PND_ACTIVITY_BUCKET_MS = 60 * 60 * 1000;

/**
 * Buckets in the series. Also the upper bound the `GetProposalsActivityResponse` contract puts on
 * `buckets`, so a series longer than this does not parse.
 */
export const PND_ACTIVITY_BUCKET_COUNT = 24;

export interface PndActivityWindow {
  /** Epoch milliseconds at the start of the newest hour in the series — the hour `now` falls in. */
  end: number;
  /** Epoch milliseconds at the start of the oldest hour in the series. */
  start: number;
}

/**
 * The exact hour boundaries the series covers, derived from `now` rather than from whatever the
 * `date_histogram` happened to emit.
 *
 * A `now-24h` range with a `1h` `fixed_interval` straddles **25** hour boundaries whenever `now`
 * is not exactly on the hour, and the oldest of those is a partial hour: it would blow the
 * response contract's 24-bucket bound, and it would render as an artificially quiet hour because
 * it only covers the minutes after `now-24h`. Anchoring on the hour containing `now` and walking
 * back 23 hours keeps the series exactly 24 whole-hour slots wide, with the current (still
 * filling) hour last — which is the one the sparkline labels "Now".
 */
export const resolveActivityWindow = (now: number): PndActivityWindow => {
  const end = Math.floor(now / PND_ACTIVITY_BUCKET_MS) * PND_ACTIVITY_BUCKET_MS;

  return { end, start: end - (PND_ACTIVITY_BUCKET_COUNT - 1) * PND_ACTIVITY_BUCKET_MS };
};
