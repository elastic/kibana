/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../evaluate';
import { splunkRules } from '../../datasets/rules/splunk';

evaluate.describe('Splunk SPL Rule Migration', { tag: tags.stateful.classic }, () => {
  evaluate('translates SPL rules correctly', async ({ evaluateRuleDataset, log }) => {
    if (splunkRules.length === 0) {
      log.warning(
        'No Splunk rule examples in dataset — skipping evaluation. ' +
          'Add curated examples to datasets/rules/splunk/splunk_rules.ts'
      );
      return;
    }

    log.info(`Running Splunk SPL rule migration evaluation with ${splunkRules.length} examples`);

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
