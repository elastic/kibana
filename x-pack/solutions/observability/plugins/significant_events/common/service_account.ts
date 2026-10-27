/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

/** The service account knowledge indicator extraction runs as, shared by every space. */
export const KI_EXTRACTION_SERVICE_ACCOUNT_NAME = 'nightshift_ki_extraction';

/**
 * The role of the KI extraction service account, named like the account. It starts from the
 * Nightshift privilege the KI routes require; a privilege is only added once a run was refused
 * without it.
 */
export const KI_EXTRACTION_SERVICE_ACCOUNT_ROLE: Omit<estypes.SecurityPutRoleRequest, 'name'> = {
  description:
    'Privileges for the service account that runs knowledge indicator extraction. Assigned by Kibana; do not assign to users.',
  cluster: [],
  indices: [],
  applications: [
    {
      application: 'kibana-.kibana',
      // `manage_nightshift`, which every KI route requires.
      privileges: ['feature_nightshift.minimal_all'],
      resources: ['*'],
    },
  ],
  run_as: [],
};
