/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Whether Nightshift is set up in a space. Investigations run only as the Nightshift service
 * account, so a space is usable once its bound investigation workflow is installed and enabled.
 */
export interface InvestigatorServiceAccountStatus {
  serviceAccountsEnabled: boolean;
  serviceAccountId: string;
  workflowId: string;
  installed: boolean;
  enabled: boolean | null;
  /** The bound Slack thread workflow, which continues investigations from Slack replies. */
  slackThreadInstalled: boolean;
}
