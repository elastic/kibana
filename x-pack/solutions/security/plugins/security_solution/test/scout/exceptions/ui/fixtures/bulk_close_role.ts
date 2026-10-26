/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-security';

/**
 * Custom role for the bulk-close-on-exception-creation specs.
 *
 * - `ml: ['all']` — the exception flyout resolves an ML rule's anomaly
 *   index through `useSecurityJobs`, which returns no jobs unless the user
 *   has ML *admin* capabilities (see `hasMlAdminPermissions`). With `read`
 *   the field picker silently falls back to the default index patterns and
 *   the source-index runtime field never shows up.
 * - `.ml-anomalies-*` read — the picker's field-caps request runs as the
 *   browser user against the rule's anomaly results index. The stateful
 *   built-in `editor` role lacks this (its stack read pattern excludes
 *   dot-prefixed indices).
 * - `.internal.alerts-security*` write — closing alerts runs an
 *   `_update_by_query` whose inner bulk writes address the concrete backing
 *   index (`.internal.alerts-security.alerts-<space>-NNNNNN`), so alias
 *   privileges on `.alerts-security*` alone yield a per-item 403. Among the
 *   predefined roles only `editor` carries the backing-index pattern.
 *
 * No ES cluster privileges are required: Kibana's ML plugin calls the ES ML
 * APIs as the internal user, gated by the Kibana feature capabilities above.
 */
export const BULK_CLOSE_TEST_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: ['.alerts-security*', '.internal.alerts-security*', '.siem-signals-*'],
        privileges: ['read', 'view_index_metadata', 'write', 'maintenance'],
      },
      {
        names: ['.ml-anomalies-*'],
        privileges: ['read', 'view_index_metadata'],
      },
      {
        // Source index of the non-ML variant (`bulk_close_runtime_field.spec.ts`).
        names: ['scout-runtime-field-bulk-close*'],
        privileges: ['read', 'view_index_metadata'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        ml: ['all'],
        securitySolutionRulesV4: ['all'],
        securitySolutionAlertsV1: ['all'],
        siemV5: ['read'],
      },
      spaces: ['*'],
    },
  ],
};
