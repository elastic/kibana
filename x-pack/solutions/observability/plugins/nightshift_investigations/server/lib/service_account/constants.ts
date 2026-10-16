/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The Nightshift service accounts of a space, as proposed in "Nightshift service accounts and
 * required privileges". The space is the account's scope: each account holds a role whose Kibana
 * privileges name only that space, so an account cannot act in another space even with a token.
 * Stack service accounts live in the `kibana` namespace, so the ids are deterministic.
 */
export type NightshiftServiceAccountKind = 'agent' | 'relay' | 'automations' | 'detection';

/** Elasticsearch roles of a space's accounts. The relay shares the agent's role. */
export type NightshiftRoleKind = 'agent' | 'automations' | 'detection';

export const NIGHTSHIFT_SERVICE_ACCOUNT_KINDS: readonly NightshiftServiceAccountKind[] = [
  'agent',
  'relay',
  'automations',
  'detection',
];

export const NIGHTSHIFT_ROLE_KINDS: readonly NightshiftRoleKind[] = [
  'agent',
  'automations',
  'detection',
];

const SERVICE_ACCOUNT_NAME_PREFIX: Record<NightshiftServiceAccountKind, string> = {
  agent: 'nightshift-agent',
  relay: 'relay',
  automations: 'nightshift-automations',
  detection: 'nightshift-detection',
};

const ROLE_OF_ACCOUNT: Record<NightshiftServiceAccountKind, NightshiftRoleKind> = {
  agent: 'agent',
  relay: 'agent',
  automations: 'automations',
  detection: 'detection',
};

export const getNightshiftServiceAccountName = (
  kind: NightshiftServiceAccountKind,
  spaceId: string
): string => `${SERVICE_ACCOUNT_NAME_PREFIX[kind]}-${spaceId}`;

export const getNightshiftServiceAccountId = (
  kind: NightshiftServiceAccountKind,
  spaceId: string
): string => `kibana/${getNightshiftServiceAccountName(kind, spaceId)}`;

/**
 * Role names cannot start with an underscore (Elasticsearch reserves those), so the proposed
 * `_nightshift_agent` becomes `nightshift_agent_<space>`.
 */
export const getNightshiftRoleName = (kind: NightshiftRoleKind, spaceId: string): string =>
  `nightshift_${kind}_${spaceId}`;

export const getNightshiftRoleOfAccount = (
  kind: NightshiftServiceAccountKind,
  spaceId: string
): string => getNightshiftRoleName(ROLE_OF_ACCOUNT[kind], spaceId);

/** The account investigations of a space run as. */
export const getInvestigatorServiceAccountId = (spaceId: string): string =>
  getNightshiftServiceAccountId('agent', spaceId);

export { getNightshiftBoundInvestigationWorkflowId as getBoundInvestigationWorkflowId } from '@kbn/workflows/managed';

/**
 * Whether a space's entry point is installed, enabled, and bound to the space's agent account. An
 * entry point bound to any other account (for example one left from an earlier setup) does not
 * count, since `_ensure` would reject every run it starts.
 */
export const isEntryPointReady = (
  workflow:
    | { enabled?: boolean; definition?: { settings?: { run_as?: string } } | null }
    | null
    | undefined,
  spaceId: string
): boolean =>
  Boolean(
    workflow?.definition &&
      workflow.enabled &&
      workflow.definition.settings?.run_as === getInvestigatorServiceAccountId(spaceId)
  );
