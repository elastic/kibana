/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../evaluate';
import { qradarRules } from '../../datasets/rules/qradar';

evaluate.describe('QRadar Rule Migration', { tag: tags.stateful.classic }, () => {
  evaluate('translates QRadar rules correctly', async ({ evaluateRuleDataset, log }) => {
    if (qradarRules.length === 0) {
      log.warning(
        'No QRadar rule examples in dataset — skipping evaluation. ' +
          'Add curated examples to datasets/rules/qradar/qradar_rules.ts'
      );
      return;
    }

    log.info(`Running QRadar rule migration evaluation with ${qradarRules.length} examples`);

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
