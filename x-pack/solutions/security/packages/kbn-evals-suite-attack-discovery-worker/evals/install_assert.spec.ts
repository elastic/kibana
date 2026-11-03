/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate, tags } from '../src/evaluate';

/**
 * Install assert: a spec with no rows, so the worker-scoped `adWorkerPreflight` fixture
 * (`auto: true`) runs against a live stack on its own. If the runner or review workflow is not
 * installed with the steps this suite reads, the eval space cannot be prepared, or the cohort's
 * models cannot be routed, the fixture throws before the test body runs and names the failing
 * check. Use `--grep "install assert"` to check a stack without spending a run.
 */
evaluate.describe('Attack Discovery Worker: install assert', { tag: tags.stateful.classic }, () => {
  evaluate('stack preflight and workflow install-assert pass', async ({ adWorkerClient }) => {
    void adWorkerClient;
  });
});
