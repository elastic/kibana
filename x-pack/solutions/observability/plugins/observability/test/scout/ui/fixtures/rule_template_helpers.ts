/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout-oblt';

const RULE_TEMPLATE_SO_TYPE = 'alerting_rule_template';
const SEED_TEMPLATE_ID = 'nav-test-v2-template';

/** Seeds a single v2-engine rule template so the `v2RuleTemplatesAvailable` capability resolves to `true`. */
export const seedV2RuleTemplate = async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient.savedObjects.create({
    type: RULE_TEMPLATE_SO_TYPE,
    id: SEED_TEMPLATE_ID,
    overwrite: true,
    attributes: {
      engine: 'v2',
      rule: {
        kind: 'alert',
        metadata: {
          name: 'Nav test template',
          description: 'Seeded by the navigation scout test.',
          tags: ['nav-test'],
        },
        schedule: { every: '5m', lookback: '15m' },
        query: {
          base: 'FROM metrics-* | STATS val = MAX(value) BY host.name',
          breach: { segment: 'WHERE val > 90' },
        },
        grouping: { fields: ['host.name'] },
        time_field: '@timestamp',
      },
    },
  });
  await kbnClient.uiSettings.waitForEventualCacheRefresh();
};

/** Removes all seeded rule templates. */
export const cleanUpRuleTemplates = async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient.savedObjects.clean({ types: [RULE_TEMPLATE_SO_TYPE] });
  await kbnClient.uiSettings.waitForEventualCacheRefresh();
};
