/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-oblt';
import NIGHTSHIFT_AGENT_ROLE from '../../../../scripts/service_account_roles/nightshift_agent.json';
import NIGHTSHIFT_AUTOMATIONS_ROLE from '../../../../scripts/service_account_roles/nightshift_automations.json';

/**
 * The stateful roles of the Nightshift service accounts, named like the accounts. Nightshift never
 * creates these roles, so a test that sets up a space creates them first. Local development
 * creates them with `scripts/create_service_account_roles.ts` from the same JSON files.
 */
export const NIGHTSHIFT_SERVICE_ACCOUNT_ROLES = {
  nightshift_agent: NIGHTSHIFT_AGENT_ROLE,
  nightshift_automations: NIGHTSHIFT_AUTOMATIONS_ROLE,
} as const;

/**
 * Creates or updates the roles of the Nightshift service accounts on stateful Elasticsearch, local
 * or Cloud. Serverless has its own `_`-prefixed predefined roles, which tests cannot create.
 */
export const ensureNightshiftServiceAccountRoles = async (
  esClient: EsClient,
  { isServerless }: { isServerless: boolean }
): Promise<void> => {
  if (isServerless) {
    return;
  }
  await Promise.all(
    Object.entries(NIGHTSHIFT_SERVICE_ACCOUNT_ROLES).map(([name, role]) =>
      esClient.security.putRole({ name, ...role })
    )
  );
};
