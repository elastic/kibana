/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNightshiftBoundInvestigationWorkflowId } from '@kbn/workflows/managed';

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

/** `kibana/<name>`; user-managed service accounts live in the `kibana` namespace. */
export const getNightshiftServiceAccountName = (kind: NightshiftServiceAccountKind): string =>
  `nightshift_${kind}`;

export const getNightshiftServiceAccountId = (kind: NightshiftServiceAccountKind): string =>
  `kibana/${getNightshiftServiceAccountName(kind)}`;

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

/** The account investigations run as. */
export const INVESTIGATOR_SERVICE_ACCOUNT_ID = getNightshiftServiceAccountId('agent');

export { getNightshiftBoundInvestigationWorkflowId as getBoundInvestigationWorkflowId };

/**
 * Whether a space's investigation entry point is ready: installed, enabled and bound to the agent
 * account. A space is set up exactly when this holds.
 */
export const isEntryPointReady = (
  workflow:
    | { enabled?: boolean; definition?: { settings?: { run_as?: string } } | null }
    | null
    | undefined
): boolean =>
  Boolean(
    workflow?.definition &&
      workflow.enabled &&
      workflow.definition.settings?.run_as === INVESTIGATOR_SERVICE_ACCOUNT_ID
  );
