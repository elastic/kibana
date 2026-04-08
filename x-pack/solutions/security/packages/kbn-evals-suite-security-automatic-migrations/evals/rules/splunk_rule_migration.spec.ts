/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '../../evaluate';
import { splunkRules } from '../../datasets/rules/splunk';

evaluate.describe('Splunk SPL Rule Migration', () => {
  evaluate('translates SPL rules correctly', async ({ evaluateRuleDataset }) => {
    await evaluateRuleDataset({
      dataset: {
        name: 'rule-migration: splunk-spl',
        description:
          'Evaluates Splunk SPL detection rule translation to Elastic ESQL. ' +
          'Covers simple rules, rules with macros/lookups, unsupported patterns, ' +
          'prebuilt rule matching, and integration matching.',
        examples: splunkRules,
      },
      vendor: 'splunk',
    });
  });
});
