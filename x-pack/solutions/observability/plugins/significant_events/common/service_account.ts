/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

/** The service account the detection engine runs as, shared by every space. */
export const DETECTION_ENGINE_SERVICE_ACCOUNT_NAME = 'nightshift_detection_engine';

/**
 * The role of the detection engine service account, named like the account. It starts from the
 * Nightshift privilege the detection engine routes require; a privilege is only added once a run
 * was refused without it.
 */
export const DETECTION_ENGINE_SERVICE_ACCOUNT_ROLE: Omit<estypes.SecurityPutRoleRequest, 'name'> = {
  description:
    'Privileges for the service account the Nightshift detection engine runs as. Assigned by Kibana; do not assign to users.',
  // Calls the LLM through an inference endpoint (feature identification, query generation).
  cluster: ['monitor_inference'],
  indices: [
    {
      // Source data. A source is any ES|QL query, read through the source's view, which checks
      // the caller's read on the indices behind it (without it the view returns no documents, and
      // no error). Sources can name any index, so the account reads every non-system index.
      // TODO: refuse to save a source whose author cannot read what it queries.
      names: ['*'],
      privileges: ['read'],
      allow_restricted_indices: false,
    },
  ],
  applications: [
    {
      application: 'kibana-.kibana',
      // `manage_nightshift`, which every detection engine route requires.
      privileges: ['feature_nightshift.minimal_all'],
      resources: ['*'],
    },
  ],
  run_as: [],
};
