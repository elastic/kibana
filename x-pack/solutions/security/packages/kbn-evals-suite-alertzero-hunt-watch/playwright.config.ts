/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightEvalsConfig } from '@kbn/evals';
import { HUNT_WATCH_TIMEOUT_MS, pinSingleRepetition } from './src/playwright_settings';

// createPlaywrightEvalsConfig reads EVAL_REPETITIONS before the `repetitions`
// option, so the env must be pinned first or the option is dead.
pinSingleRepetition(process.env);

export default createPlaywrightEvalsConfig({
  testDir: `${__dirname}/evals`,
  // Sized by src/playwright_settings.test.ts.
  timeout: HUNT_WATCH_TIMEOUT_MS,
  // The sweep runs inside the Playwright task, not inside the experiment
  // task: runExperiment's task merely replays the recorded run records, so
  // repetitions > 1 would publish repeated "independent" measurements of one
  // sweep. The spec asserts it as a backstop.
  repetitions: 1,
});
