/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate, tags } from '../src/evaluate';

/**
 * Install assert: a spec with no rows, so the worker-scoped `huntWatchPreflight` and
 * `huntWatchSeed` fixtures (`auto: true`) run against a live Scout stack on their own. If the
 * stack is missing a global child workflow, the per-space Worker is not installed and enabled,
 * the TI supply hard gate is failing, the subject-model bridge is unsafe, or a seeded report id
 * is absent, the fixture throws before this test body runs and names the failing gate. Useful
 * with `--grep "install assert"` to check a stack without spending a Worker run.
 */
evaluate.describe(
  'Hunt Watch Worker — install assert',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate('stack preflight and workflow install-assert pass', async ({ huntWatchClient }) => {
      void huntWatchClient;
    });
  }
);
