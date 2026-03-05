/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../src/evaluate';
import { THREAT_DETECTION_DATASET } from './threat_detection_datasets';

evaluate.describe('Threat Detection and Other', { tag: tags.stateful.classic }, () => {
  evaluate('threat detection and other entity analytics prompts', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: THREAT_DETECTION_DATASET,
    });
  });
});
