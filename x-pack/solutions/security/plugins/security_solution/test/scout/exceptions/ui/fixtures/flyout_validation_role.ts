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
 * Custom role for `flyout_validation.spec.ts`, limited to the worker's space.
 *
 * - The flyout reads the fields of the spec's own index as the logged-in user. The index has a
 *   dedicated prefix because predefined roles only read patterns that other suites write to.
 * - The exceptions viewer disables "Add rule exception" without write access to the alerts index
 *   (`hasIndexWrite`), which `create_doc` satisfies.
 */
export const getFlyoutValidationRole = (spaceId: string): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: [`${FLYOUT_VALIDATION_INDEX_PREFIX}*`],
        privileges: ['read', 'view_index_metadata'],
      },
      {
        names: [`.alerts-security.alerts-${spaceId}`],
        privileges: ['read', 'view_index_metadata', 'create_doc'],
      },
      {
        names: [`.siem-signals-${spaceId}*`],
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
      spaces: [spaceId],
    },
  ],
});
