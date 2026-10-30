/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

type RoleDescriptor = Omit<estypes.SecurityPutRoleRequest, 'name'>;

/**
 * The roles of the Nightshift service accounts on stateful Elasticsearch, named like the accounts.
 * Serverless defines them in elasticsearch-controller as `_nightshift_agent` and
 * `_nightshift_automations`; keep the grants in sync. Nightshift never creates these roles at
 * runtime: tests, evals and local development create them with
 * `ensureNightshiftServiceAccountRoles`.
 */
export const NIGHTSHIFT_STATEFUL_SERVICE_ACCOUNT_ROLES: Readonly<Record<string, RoleDescriptor>> = {
  nightshift_agent: {
    description:
      'Privileges for the service account of the Nightshift agent. Assigned by Kibana; do not assign to users.',
    cluster: ['monitor_inference'],
    indices: [
      {
        names: [
          'ai-index-idx-nightshift-cortex',
          'ai-index-idx-nightshift-semantic-memory',
          'ai-index-idx-nightshift-decision-trees',
        ],
        privileges: ['read', 'view_index_metadata', 'write', 'auto_configure'],
        allow_restricted_indices: false,
      },
    ],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: [
          'feature_nightshift.minimal_all',
          'feature_agentBuilder.minimal_all',
          'feature_actions.read',
          'feature_workflowsManagement.read',
        ],
        resources: ['*'],
      },
    ],
    run_as: [],
  },
  nightshift_automations: {
    description:
      'Privileges for the service account of Nightshift automations. Assigned by Kibana; do not assign to users.',
    cluster: ['monitor_inference'],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: [
          'feature_agenticInvestigations.minimal_read',
          'feature_agenticInvestigations.investigations_all',
          'feature_agentBuilder.minimal_all',
          'feature_actions.read',
        ],
        resources: ['*'],
      },
    ],
    run_as: [],
  },
};

/**
 * Creates or updates the roles of the Nightshift service accounts on stateful Elasticsearch, local
 * or Cloud. Does nothing on Serverless, whose `_`-prefixed predefined roles cannot be created.
 */
export const ensureNightshiftServiceAccountRoles = async (
  esClient: { security: { putRole: (params: estypes.SecurityPutRoleRequest) => Promise<unknown> } },
  { isServerless }: { isServerless: boolean }
): Promise<void> => {
  if (isServerless) {
    return;
  }
  await Promise.all(
    Object.entries(NIGHTSHIFT_STATEFUL_SERVICE_ACCOUNT_ROLES).map(([name, role]) =>
      esClient.security.putRole({ name, ...role })
    )
  );
};
