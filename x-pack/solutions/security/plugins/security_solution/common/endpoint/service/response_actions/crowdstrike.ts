/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepFreeze } from '@kbn/std';

export const CROWDSTRIKE_HOST_INDEX_PATTERN = 'logs-crowdstrike.host-*';

/**
 * List of all crowdstrike index patterns by integration
 */
export const CROWDSTRIKE_INDEX_PATTERNS_BY_INTEGRATION = deepFreeze({
  crowdstrike: [
    'logs-crowdstrike.alert-*',
    'logs-crowdstrike.falcon-*',
    'logs-crowdstrike.fdr-*',
    CROWDSTRIKE_HOST_INDEX_PATTERN,
    'logs-crowdstrike.vulnerability-*',
  ],
});
