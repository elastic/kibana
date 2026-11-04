/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNightshiftBoundInvestigationWorkflowId } from '@kbn/workflows/managed';

export { getNightshiftBoundInvestigationWorkflowId as getBoundInvestigationWorkflowId };

/**
 * Template value of the entry point holding the automations account's id. The agent account's id
 * is the entry point's own `serviceAccountId` value, which renders as its `settings.run_as`.
 */
export const AUTOMATIONS_SERVICE_ACCOUNT_ID_VALUE = 'automationsServiceAccountId';

interface EntryPointLike {
  enabled?: boolean;
  definition?: { settings?: { run_as?: string } } | null;
}

/**
 * The agent account a space is set up with: the account its investigation entry point runs as.
 * The service accounts backend assigns the id (a generated one on Serverless), so a space is
 * compared against its own entry point rather than a fixed id.
 */
export const getEntryPointServiceAccountId = (
  workflow: EntryPointLike | null | undefined
): string | undefined => {
  const runAs = workflow?.definition?.settings?.run_as;
  return typeof runAs === 'string' && runAs.length > 0 ? runAs : undefined;
};

/**
 * Whether a space's investigation entry point is ready: installed, enabled and bound to an
 * account. A space is set up exactly when this holds.
 */
export const isEntryPointReady = (workflow: EntryPointLike | null | undefined): boolean =>
  Boolean(workflow?.definition && workflow.enabled && getEntryPointServiceAccountId(workflow));
