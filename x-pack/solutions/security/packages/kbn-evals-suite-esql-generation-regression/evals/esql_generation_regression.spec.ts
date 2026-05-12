/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../src/evaluate';

evaluate.describe('Security ES|QL generation regression', { tag: tags.stateful.classic }, () => {
  evaluate('full dataset', async ({ evaluateDataset }) => {
    await evaluateDataset();
  });
});
