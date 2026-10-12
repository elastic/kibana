/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Whether investigations in a space run as the Nightshift service account. */
export interface InvestigatorServiceAccountStatus {
  serviceAccountsEnabled: boolean;
  serviceAccountId: string;
  workflowId: string;
  installed: boolean;
  enabled: boolean | null;
}
