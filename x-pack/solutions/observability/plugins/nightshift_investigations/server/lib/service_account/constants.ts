/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Used for both the Elasticsearch role and the service account. */
export const NIGHTSHIFT_INVESTIGATOR_NAME = 'nightshift_investigator';

/** Stack service accounts live in the `kibana` namespace, so the id is deterministic. */
export const NIGHTSHIFT_INVESTIGATOR_SERVICE_ACCOUNT_ID = `kibana/${NIGHTSHIFT_INVESTIGATOR_NAME}`;

export { getNightshiftBoundInvestigationWorkflowId as getBoundInvestigationWorkflowId } from '@kbn/workflows/managed';
