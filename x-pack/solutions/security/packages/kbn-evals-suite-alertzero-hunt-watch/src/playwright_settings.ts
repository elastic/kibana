/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Playwright settings shared by playwright.config.ts and the budget test, so
 * the test reads the shipped value instead of parsing the config source.
 */

import { HUNT_REPORTS_PER_PHASE, PER_HUNT_MS } from './harness/phases';

const PHASES = 3;

/**
 * 3 phases x 14 reports x PER_HUNT_MS (60s per hunt, incl. Tier 2 model
 * calls) plus ingest/refresh/poll overhead.
 */
export const HUNT_WATCH_TIMEOUT_MS = 60 * 60_000;

export const HUNT_WATCH_MIN_TIMEOUT_MS = PER_HUNT_MS * HUNT_REPORTS_PER_PHASE * PHASES;

/**
 * `createPlaywrightEvalsConfig` resolves `EVAL_REPETITIONS` before the
 * `repetitions` config value, so the config value alone does not pin anything.
 * The sweep runs once inside the Playwright task and the experiment task only
 * replays it, so any other count would publish one sweep as several
 * independent measurements. Overrides a global `EVAL_REPETITIONS` (the
 * pipelines export it for every suite) to 1 for this suite and reports it.
 */
export const pinSingleRepetition = (
  env: NodeJS.ProcessEnv,
  warn: (message: string) => void = console.warn
): void => {
  const requested = env.EVAL_REPETITIONS;
  if (requested !== undefined && requested !== '' && parseInt(requested, 10) !== 1) {
    warn(
      `[hunt-watch] ignoring EVAL_REPETITIONS=${requested}: the sweep is recorded once and replayed, so this suite always runs with repetitions=1`
    );
  }
  env.EVAL_REPETITIONS = '1';
};
