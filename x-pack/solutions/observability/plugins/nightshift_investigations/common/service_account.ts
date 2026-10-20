/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** One of the Nightshift service accounts and the built-in role it holds. */
export interface NightshiftServiceAccountInfo {
  kind: 'agent' | 'automations' | 'detection';
  id: string;
  role: string;
}

/** A workflow a space binds to the agent account, as installed. */
export interface NightshiftBoundWorkflowStatus {
  /** Document id in the space. */
  workflowId: string;
  installed: boolean;
  enabled: boolean | null;
  /** The account its `settings.run_as` names, or null when it names none. */
  runAs: string | null;
  /** Whether `runAs` is the agent account. */
  bound: boolean;
  /**
   * False when the workflow failed validation, for example the Slack thread workflow on a
   * deployment without the Slack trigger. Such a workflow cannot run until it validates.
   */
  valid: boolean | null;
}

/**
 * Whether Nightshift is set up in a space. A space is set up once its investigation entry point
 * is installed, enabled and bound to the Nightshift agent service account.
 */
export interface InvestigatorServiceAccountStatus {
  serviceAccountsEnabled: boolean;
  /**
   * Whether the caller holds `manage_security`, which writing any workflow bound to a service
   * account requires: setting the space up, and creating, changing or deleting automations.
   */
  canModifyBoundWorkflows: boolean;
  /** The agent account investigations run as. */
  serviceAccountId: string;
  /** The built-in role the agent account holds. */
  role: string;
  /** The entry point. */
  workflowId: string;
  installed: boolean;
  enabled: boolean | null;
  /** Whether the entry point is bound to the agent account. */
  bound: boolean;
  /** Every Nightshift service account, with its role. */
  serviceAccounts: NightshiftServiceAccountInfo[];
  /** Every workflow `_enable` binds in the space, entry point included. */
  boundWorkflows: NightshiftBoundWorkflowStatus[];
}
