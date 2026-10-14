/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { WorkflowDetailDto } from '@kbn/workflows';
import {
  SECURITY_ROLE_API_VERSION,
  WORKER_SERVICE_ACCOUNT_NAMES,
  buildSecurityRoleUrl,
  getWorkerRoleName,
} from '@kbn/alertzero-common';
import { WORKFLOWS_API_VERSION } from './constants';

export const COVERAGE_WORKER_ID = 'system-security-detection-rule-coverage';
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

const isServerlessDeployment = async (fetch: HttpHandler): Promise<boolean> => {
  const status = await fetch<{ version?: { build_flavor?: string } }>('/api/status', {
    method: 'GET',
  });
  return status.version?.build_flavor === 'serverless';
};

/**
 * The coverage worker's role is built in (an ES reserved role on stateful, a predefined role on
 * Serverless), so the eval only looks it up. It never creates or changes a role.
 */
const findBuiltInRole = async (fetch: HttpHandler, accountName: string): Promise<string> => {
  const isServerless = await isServerlessDeployment(fetch);
  const roleName = getWorkerRoleName(accountName, { isServerless });
  const missing = () =>
    new Error(
      `Built-in ${isServerless ? 'predefined' : 'reserved'} role ${roleName} is missing on this ` +
        'stack; AlertZero evals do not create worker roles'
    );
  let role: { metadata?: { _reserved?: unknown } };
  try {
    role = await fetch(buildSecurityRoleUrl(roleName), {
      method: 'GET',
      version: SECURITY_ROLE_API_VERSION,
      headers: { 'elastic-api-version': SECURITY_ROLE_API_VERSION },
    });
  } catch (error) {
    throw statusOf(error) === 404 ? missing() : error;
  }
  if (role.metadata?._reserved !== true) throw missing();
  return roleName;
};

const ensureAccount = async (fetch: HttpHandler): Promise<string> => {
  const accountName = WORKER_SERVICE_ACCOUNT_NAMES[COVERAGE_WORKER_ID];
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
    (account) => account.name === accountName && account.enabled && account.assumable
  );
  if (existing) return existing.id;
  if (accounts.some((account) => account.name === accountName)) {
    throw new Error(`Service account ${accountName} is disabled or not assumable`);
  }
  const roleName = await findBuiltInRole(fetch, accountName);
  const created = await fetch<Account>(ACCOUNTS_URL, {
    method: 'POST',
    body: JSON.stringify({
      name: accountName,
      roles: [roleName],
      description: 'Rule-coverage eval worker',
    }),
  });
  if (!created.id) throw new Error(`Service account ${accountName} was created without an id`);
  return created.id;
};

/** Bind the per-space entry point; the global sweep can only inherit from this worker. */
export const bindCoverageWorker = async (
  fetch: HttpHandler
): Promise<{ workflowId: string; enabledByBind: boolean }> => {
  const { workers } = await fetch<{ workers: Worker[] }>(WORKERS_URL, {
    ...INTERNAL_OPTIONS,
    method: 'GET',
  });
  const worker = workers.find(({ id }) => id === COVERAGE_WORKER_ID);
  if (!worker) throw new Error(`Worker ${COVERAGE_WORKER_ID} is absent from the catalog`);
  const serviceAccountId = worker.settings.serviceAccountId ?? (await ensureAccount(fetch));
  await fetch(`${WORKERS_URL}/${COVERAGE_WORKER_ID}`, {
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
        extras: { lookbackDays: 14, maxGapsPerRun: 5 },
      },
    }),
  });
  const readBack = await fetch<{ workers: Worker[] }>(WORKERS_URL, {
    ...INTERNAL_OPTIONS,
    method: 'GET',
  });
  const bound = readBack.workers.find(({ id }) => id === COVERAGE_WORKER_ID);
  if (
    !bound?.enabled ||
    !bound.workflowId ||
    bound.settings.serviceAccountId !== serviceAccountId
  ) {
    throw new Error(
      `Worker ${COVERAGE_WORKER_ID} did not retain its enabled service account binding`
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
  return { workflowId: bound.workflowId, enabledByBind: !worker.enabled };
};
