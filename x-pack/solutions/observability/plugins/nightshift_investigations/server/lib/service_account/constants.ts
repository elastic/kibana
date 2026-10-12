/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';

/** Used for both the Elasticsearch role and the service account. */
export const NIGHTSHIFT_INVESTIGATOR_NAME = 'nightshift_investigator';

/** Stack service accounts live in the `kibana` namespace, so the id is deterministic. */
export const NIGHTSHIFT_INVESTIGATOR_SERVICE_ACCOUNT_ID = `kibana/${NIGHTSHIFT_INVESTIGATOR_NAME}`;

/** Document id of the per-space bound investigation workflow (installed with `workflowIdSuffix`). */
export const getBoundInvestigationWorkflowId = (spaceId: string): string =>
  `${NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID}-${spaceId}`;
