/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { ChangesHistoryUsage } from '../types';

export const changesHistoryUsageSchema: MakeSchemaFrom<ChangesHistoryUsage> = {
  revision_saved: {
    type: 'long',
    _meta: {
      description:
        'Number of detection rule revisions saved to changes history in the collection period',
    },
  },
  rule_restored: {
    type: 'long',
    _meta: {
      description:
        'Number of detection rules restored from changes history in the collection period',
    },
  },
};
