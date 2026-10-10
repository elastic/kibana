/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { WorkflowDetailDto } from '@kbn/workflows';
import {
  WORKER_ROLE_DEFINITIONS,
  buildSecurityRoleUrl,
  SECURITY_ROLE_API_VERSION,
} from '@kbn/alertzero-plugin/common/worker_roles';
import { WORKFLOWS_API_VERSION } from './constants';

export const RULE_TUNING_WORKER_ID = 'system-security-detection-rule-tuning';
const WORKERS_URL = '/internal/alertzero/workers';
const ACCOUNTS_URL = '/internal/security/service_account';
const INTERNAL_OPTIONS = {
  version: '1',
  headers: { 'elastic-api-version': '1', 'kbn-xsrf': 'true' },
};

interface Account {
  id: string;
  name: string;
  enabled: boolean;
  assumable: boolean;
}
interface Worker {
  id: string;
  enabled: boolean;
  workflowId: string | null;
  settingsRevision: number | null;
  settings: { serviceAccountId?: string };
}

const statusOf = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const { status, response } = error as { status?: number; response?: { status?: number } };
  return status ?? response?.status;
};

const ensureAccount = async (fetch: HttpHandler): Promise<string> => {
  const definition = WORKER_ROLE_DEFINITIONS[RULE_TUNING_WORKER_ID];
  const accounts: Account[] = [];
  let after: string | undefined;
  do {
    const page = await fetch<{ serviceAccounts: Account[]; nextPage?: string }>(ACCOUNTS_URL, {
      method: 'GET',
      query: { limit: 100, ...(after ? { after } : {}) },
    });
    accounts.push(...page.serviceAccounts);
    after = page.nextPage;
  } while (after);
  const existing = accounts.find(
    (account) => account.name === definition.name && account.enabled && account.assumable
  );
  if (existing) return existing.id;
  if (accounts.some((account) => account.name === definition.name)) {
    throw new Error(`Service account ${definition.name} is disabled or not assumable`);
  }
  try {
    await fetch(buildSecurityRoleUrl(definition.name), {
      method: 'PUT',
      version: SECURITY_ROLE_API_VERSION,
      headers: { 'elastic-api-version': SECURITY_ROLE_API_VERSION },
      query: { createOnly: true },
      body: JSON.stringify(definition.role),
    });
  } catch (error) {
    if (statusOf(error) !== 409) throw error;
  }
  const created = await fetch<Account>(ACCOUNTS_URL, {
    method: 'POST',
    body: JSON.stringify({
      name: definition.name,
      roles: [definition.name],
      description: 'Rule-tuning eval worker',
    }),
  });
  if (!created.id) throw new Error(`Service account ${definition.name} was created without an id`);
  return created.id;
};

/** Bind the per-space entry point; the global sweep can only inherit from this worker. */
export const bindRuleTuningWorker = async (fetch: HttpHandler): Promise<string> => {
  const { workers } = await fetch<{ workers: Worker[] }>(WORKERS_URL, {
    ...INTERNAL_OPTIONS,
    method: 'GET',
  });
  const worker = workers.find(({ id }) => id === RULE_TUNING_WORKER_ID);
  if (!worker) throw new Error(`Worker ${RULE_TUNING_WORKER_ID} is absent from the catalog`);
  const serviceAccountId = worker.settings.serviceAccountId ?? (await ensureAccount(fetch));
  await fetch(`${WORKERS_URL}/${RULE_TUNING_WORKER_ID}`, {
    ...INTERNAL_OPTIONS,
    method: 'PATCH',
    body: JSON.stringify({
      enabled: true,
      settingsRevision: worker.settingsRevision,
      settings: {
        serviceAccountId,
        autonomy: 'assisted',
        // This isolated eval stack is driven manually, not by a concurrent scheduled sweep.
        scheduleInterval: '999d',
        extras: { analysisWindowDays: 7, fpCountThreshold: 2, fpRateThresholdPct: 50 },
      },
    }),
  });
  const readBack = await fetch<{ workers: Worker[] }>(WORKERS_URL, {
    ...INTERNAL_OPTIONS,
    method: 'GET',
  });
  const bound = readBack.workers.find(({ id }) => id === RULE_TUNING_WORKER_ID);
  if (
    !bound?.enabled ||
    !bound.workflowId ||
    bound.settings.serviceAccountId !== serviceAccountId
  ) {
    throw new Error(
      `Worker ${RULE_TUNING_WORKER_ID} did not retain its enabled service account binding`
    );
  }
  const workflow = await fetch<WorkflowDetailDto>(`/api/workflows/workflow/${bound.workflowId}`, {
    method: 'GET',
    version: WORKFLOWS_API_VERSION,
    headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
  });
  if (workflow.definition?.settings?.run_as !== serviceAccountId) {
    throw new Error(`Worker ${bound.workflowId} has no matching settings.run_as after binding`);
  }
  return bound.workflowId;
};
