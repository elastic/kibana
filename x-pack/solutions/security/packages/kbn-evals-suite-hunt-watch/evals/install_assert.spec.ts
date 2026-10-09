/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate, tags } from '../src/evaluate';

/**
 * Phase 1 install-assert shell. No dataset exists yet (seed/fixture binding is Phase 2,
 * blocked on elastic/kibana#291895), so this spec exists only to give the worker-scoped
 * `huntWatchPreflight` fixture (`auto: true`) a spec to attach to on a live Scout stack.
 * If the stack is missing a global child workflow, the per-space Worker is not installed
 * and enabled, the TI supply hard gate is failing, or the subject-model bridge is unsafe,
 * the fixture throws before this test body runs and names the failing gate.
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
