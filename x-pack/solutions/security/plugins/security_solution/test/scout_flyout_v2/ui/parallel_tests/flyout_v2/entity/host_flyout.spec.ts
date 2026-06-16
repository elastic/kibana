/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Placeholder for Scout UI tests covering the host entity flyout v2.
 *
 * The host entity flyout v2 is not implemented on `main` yet. Replace the
 * `fixme` placeholder below with real coverage once it ships.
 */

import { spaceTest, tags } from '@kbn/scout-security';

spaceTest.describe(
  'Document flyout v2 — Host entity flyout',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    // TODO: Implement once the host entity flyout ships
    spaceTest.fixme('opens the host entity flyout', async () => {});
  }
);
