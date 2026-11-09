/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Entry point for the `security-persona-matrix-parity` suite. It is the default
 * persona-matrix config (built with `createPlaywrightEvalsConfig` from `@kbn/evals`) under its own
 * file name, because suite discovery keys metadata by config path and two suites cannot share one.
 * The parity seed and agent profile come from the suite id (`EVAL_SUITE_ID`), not from this file.
 */
export { default } from './playwright.config';
