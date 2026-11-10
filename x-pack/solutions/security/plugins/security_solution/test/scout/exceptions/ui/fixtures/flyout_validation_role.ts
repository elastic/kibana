/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-security';

/** Prefix of the per-space source index the flyout validation spec creates. */
export const FLYOUT_VALIDATION_INDEX_PREFIX = 'scout-exceptions-flyout';

/**
 * Custom role for `flyout_validation.spec.ts`.
 *
 * The exception flyout builds its field list and value suggestions with requests that run as
 * the logged-in user against the rule's source index. The user needs `read` and
 * `view_index_metadata` on the index the spec creates, and the predefined security roles only
 * cover the standard data patterns.
 *
 * The user also needs `write` on the alerts index. The exceptions viewer disables its "Add rule
 * exception" button unless the user can write to the alerts index (`hasIndexWrite`), although
 * the spec never saves an exception or touches an alert.
 */
export const FLYOUT_VALIDATION_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: [`${FLYOUT_VALIDATION_INDEX_PREFIX}*`],
        privileges: ['read', 'view_index_metadata'],
      },
      {
        names: ['.alerts-security*'],
        privileges: ['read', 'view_index_metadata', 'write'],
      },
      {
        names: ['.siem-signals-*'],
        privileges: ['read', 'view_index_metadata'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        securitySolutionRulesV4: ['all'],
        securitySolutionAlertsV1: ['read'],
        siemV5: ['read'],
      },
      spaces: ['*'],
    },
  ],
};
