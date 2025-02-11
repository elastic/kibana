/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin/common';

export const getNoResponseActionsRole: () => Omit<Role, 'name'> = () => ({
  elasticsearch: {
    cluster: ['manage'],
    indices: [
      {
        names: [
          '.alerts-security.alerts-default',
          '.alerts-security.alerts-*',
          '.siem-signals-*',
          '.items-*',
          '.lists-*',
          '.logs-*',
        ],
        privileges: ['manage', 'write', 'read', 'view_index_metadata'],
      },
      {
        names: ['logs-*'],
        privileges: ['read'],
      },
    ],
    run_as: [],
  },
  kibana: [
    {
      base: [],
      feature: {
        actions: ['all'],
        advancedSettings: ['all'],
        dev_tools: ['all'],
        fleet: ['all'],
        generalCasesV3: ['all'],
        indexPatterns: ['all'],
        osquery: ['all'],
        savedObjectsManagement: ['all'],
        savedObjectsTagging: ['all'],
        siemV2: [
          'minimal_all',
          'endpoint_list_all',
          'endpoint_list_read',
          'trusted_applications_all',
          'trusted_applications_read',
          'host_isolation_exceptions_all',
          'host_isolation_exceptions_read',
          'blocklist_all',
          'blocklist_read',
          'event_filters_all',
          'event_filters_read',
          'policy_management_all',
          'policy_management_read',
        ],
        securitySolutionTimeline: ['all'],
        securitySolutionNotes: ['all'],
        stackAlerts: ['all'],
      },
      spaces: ['*'],
    },
  ],
});
