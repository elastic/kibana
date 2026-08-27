/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../evaluate';
import { sentinelRules } from '../../datasets/rules/sentinel';

evaluate.describe('Microsoft Sentinel Rule Migration', { tag: tags.stateful.classic }, () => {
  evaluate(
    'translates Microsoft Sentinel rules correctly',
    async ({ evaluateRuleDataset, log }) => {
      if (sentinelRules.length === 0) {
        log.warning(
          'No Microsoft Sentinel rule examples in dataset — skipping evaluation. ' +
            'Add curated examples to datasets/rules/sentinel/sentinel_rules.ts'
        );
        return;
      }

      log.info(
        `Running Microsoft Sentinel rule migration evaluation with ${sentinelRules.length} examples`
      );

      await evaluateRuleDataset({
        dataset: {
          name: 'rule-migration: sentinel-kql',
          description:
            'Evaluates Microsoft Sentinel KQL-based detection rule translation to Elastic ESQL. ' +
            'Covers scheduled analytics rules exported from ARM templates, prebuilt matching, ' +
            'and integration matching.',
          examples: sentinelRules,
        },
        vendor: 'microsoft-sentinel',
      });
    }
  );
});
