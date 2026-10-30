/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The Nightshift service accounts. There is one of each per deployment, shared by every space:
 * - `agent` runs investigations, their sandbox tools and their Agent Builder hooks.
 * - `automations` runs automation workflows, which start investigations.
 */
export type NightshiftServiceAccountKind = 'agent' | 'automations';

export const NIGHTSHIFT_SERVICE_ACCOUNT_KINDS: readonly NightshiftServiceAccountKind[] = [
  'agent',
  'automations',
];

/** The name each account is found and created by. */
export const getNightshiftServiceAccountName = (kind: NightshiftServiceAccountKind): string =>
  `nightshift_${kind}`;

/**
 * The role an account holds. Nightshift never creates or changes these roles. On Serverless they
 * are elasticsearch-controller predefined roles, whose names must start with `_`. On stateful they
 * are named like the account and created by whoever sets up the deployment (see the README). The
 * roles cover every space; the per-space bound workflows decide where an account acts.
 */
export const getNightshiftRoleName = (
  kind: NightshiftServiceAccountKind,
  { isServerless }: { isServerless: boolean }
): string => {
  const name = getNightshiftServiceAccountName(kind);
  return isServerless ? `_${name}` : name;
};

/**
 * The ids of the accounts a space is set up with, as the service accounts backend assigned them:
 * `kibana/<name>` on stateful, a generated id on Serverless.
 */
export type NightshiftServiceAccountIds = Record<NightshiftServiceAccountKind, string>;

/** The body of `POST /internal/nightshift/investigations/service_account/_enable`. */
export interface EnableInvestigatorServiceAccountBody {
  serviceAccountIds: NightshiftServiceAccountIds;
}

/** One of the Nightshift service accounts, the role it holds, and its id in this space. */
export interface NightshiftServiceAccountInfo {
  kind: NightshiftServiceAccountKind;
  name: string;
  /** Null while the space is not set up. */
  id: string | null;
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
  /** Whether `runAs` is the space's agent account. */
  bound: boolean;
  /**
   * False when the workflow failed validation, for example the Slack thread workflow on a
   * deployment without the Slack trigger. Such a workflow cannot run until it validates.
   */
  valid: boolean | null;
}

/**
 * An automation `_enable` could not bind to the automations account. It keeps running as the user
 * who created it until it is saved again, or until setup runs again.
 */
export interface NightshiftUnboundAutomation {
  /** Saved object id of the automation. */
  id: string;
  /** Its name, when the saved object has one. */
  name?: string;
  /** Why binding it failed. */
  error: string;
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
  /** The agent account investigations run as in this space, or null while it is not set up. */
  serviceAccountId: string | null;
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
  /**
   * Automations the setup could not bind, which still run as their author. Only `_enable` reports
   * them, for the run that tried: reads of the status do not re-check every automation.
   */
  unboundAutomations?: NightshiftUnboundAutomation[];
}
