/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../src/evaluate';
import { cleanupEsqlFixtures, setupEsqlFixtures } from '../src/fixtures/setup';

evaluate.describe('Security ES|QL generation regression', { tag: tags.stateful.classic }, () => {
  // The fixture indices are what make the suite's execution-time evaluators
  // (`ES|QL Execution Validity`, `ES|QL Result Equivalence`) meaningful —
  // without them, every gold query hits `verification_exception` (unknown
  // column / unknown index) and the evaluators score 0 for every example.
  // Setup is hard-failing on purpose: a partial-fixture run that silently
  // regresses to a non-executable suite is worse than no run at all.
  evaluate.beforeAll(async ({ esClient, log }) => {
    await setupEsqlFixtures({ esClient, log });
  });

  evaluate.afterAll(async ({ esClient, log }) => {
    await cleanupEsqlFixtures({ esClient, log });
  });

  evaluate('full dataset', async ({ evaluateDataset }) => {
    await evaluateDataset();
  });
});
