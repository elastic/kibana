/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../evaluate';
import { standardDashboards } from '../../datasets/dashboards';

evaluate.describe('Dashboard Migration', { tag: tags.stateful.classic }, () => {
  evaluate('translates standard dashboards correctly', async ({ evaluateDataset, log }) => {
    if (standardDashboards.length === 0) {
      log.warning(
        'No dashboard examples in dataset — skipping evaluation. ' +
          'Add curated examples to datasets/dashboards/standard_dashboards.ts'
      );
      return;
    }

    log.info(`Running dashboard migration evaluation with ${standardDashboards.length} examples`);

    await evaluateDataset({
      dataset: {
        name: 'security-automatic-migrations: standard-dashboards',
        description:
          'Evaluates AI-translated Kibana dashboards against expert-curated Splunk dashboard pairs.',
        examples: standardDashboards,
      },
    });

    log.info('Dashboard migration evaluation complete');
  });
});
