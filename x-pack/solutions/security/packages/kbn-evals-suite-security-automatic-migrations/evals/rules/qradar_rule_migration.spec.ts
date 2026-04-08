/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '../../evaluate';
import { qradarRules } from '../../datasets/rules/qradar';

evaluate.describe('QRadar Rule Migration', () => {
  evaluate('translates QRadar rules correctly', async ({ evaluateRuleDataset }) => {
    await evaluateRuleDataset({
      dataset: {
        name: 'rule-migration: qradar',
        description:
          'Evaluates QRadar XML-based detection rule translation to Elastic ESQL. ' +
          'Covers simple event rules, building blocks, reference sets, QID maps, ' +
          'unsupported patterns, prebuilt matching, and integration matching.',
        examples: qradarRules,
      },
      vendor: 'qradar',
    });
  });
});
