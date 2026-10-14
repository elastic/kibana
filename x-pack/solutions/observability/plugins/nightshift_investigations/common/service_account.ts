/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** One of a space's Nightshift service accounts and the role it holds. */
export interface NightshiftServiceAccountInfo {
  kind: 'agent' | 'relay' | 'automations' | 'detection';
  id: string;
  role: string;
}

/** A workflow a space binds to its agent account, as installed. */
export interface NightshiftBoundWorkflowStatus {
  /** Document id in the space. */
  workflowId: string;
  installed: boolean;
  enabled: boolean | null;
  /** The account its `settings.run_as` names, or null when it names none. */
  runAs: string | null;
  /** Whether `runAs` is the space's agent account. */
  bound: boolean;
}

/**
 * Whether Nightshift is set up in a space. Investigations run only as the space's Nightshift agent
 * service account, so a space is usable once its entry point is installed, enabled and bound to
 * that account.
 */
export interface InvestigatorServiceAccountStatus {
  serviceAccountsEnabled: boolean;
  /** The agent account investigations run as. */
  serviceAccountId: string;
  /** The role the agent account holds. */
  role: string;
  /** The entry point. */
  workflowId: string;
  installed: boolean;
  enabled: boolean | null;
  /** Whether the entry point is bound to the agent account. */
  bound: boolean;
  /** The bound Slack thread workflow, which continues investigations from Slack replies. */
  slackThreadInstalled: boolean;
  /** Every account `_enable` creates for the space. */
  serviceAccounts: NightshiftServiceAccountInfo[];
  /** Every workflow `_enable` binds in the space, entry point included. */
  boundWorkflows: NightshiftBoundWorkflowStatus[];
}
