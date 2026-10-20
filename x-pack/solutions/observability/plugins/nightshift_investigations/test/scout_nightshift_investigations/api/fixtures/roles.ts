/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_FEATURE_ID } from '@kbn/nightshift-shared';
import type { KibanaRole } from '@kbn/scout-oblt';

export const NIGHTSHIFT_MANAGE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { [NIGHTSHIFT_FEATURE_ID]: ['all'] }, spaces: ['*'] }],
};

export const NIGHTSHIFT_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { [NIGHTSHIFT_FEATURE_ID]: ['read'] }, spaces: ['*'] }],
};

// Can open Kibana and the space, but has no Nightshift feature privilege at all (not even read).
// The role API requires a non-empty `base` or `feature`, so grant an unrelated privilege.
export const NIGHTSHIFT_NO_ACCESS_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { advancedSettings: ['read'] }, spaces: ['*'] }],
};
