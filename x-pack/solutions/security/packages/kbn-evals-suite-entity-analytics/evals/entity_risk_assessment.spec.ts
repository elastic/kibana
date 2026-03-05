/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../src/evaluate';
import { ENTITY_RISK_ASSESSMENT_DATASET } from './entity_risk_assessment_datasets';

evaluate.describe('Entity Risk Assessment', { tag: tags.stateful.classic }, () => {
  evaluate('entity risk assessment prompts', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: ENTITY_RISK_ASSESSMENT_DATASET,
    });
  });
});
