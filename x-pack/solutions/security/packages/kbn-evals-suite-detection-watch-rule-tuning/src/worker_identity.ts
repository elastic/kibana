/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { WorkflowDetailDto } from '@kbn/workflows';
import {
  WORKER_SERVICE_ACCOUNT_NAMES,
  buildSecurityRoleUrl,
  getWorkerRoleName,
  SECURITY_ROLE_API_VERSION,
} from '@kbn/alertzero-common';
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

/**
 * The suite runs on the stateful Scout stack, where the Worker role is an Elasticsearch reserved
 * role. AlertZero no longer creates Worker roles, so the suite only checks that it exists.
 */
const findBuiltInWorkerRole = async (fetch: HttpHandler, accountName: string): Promise<string> => {
  const roleName = getWorkerRoleName(accountName, { isServerless: false });
  const missing = () =>
    new Error(
      `Elasticsearch has no built-in "${roleName}" role for ${RULE_TUNING_WORKER_ID}. ` +
        `The ES snapshot must be at least as new as the Kibana under test.`
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
  const name = WORKER_SERVICE_ACCOUNT_NAMES[RULE_TUNING_WORKER_ID];
  if (!name) throw new Error(`No service account name for ${RULE_TUNING_WORKER_ID}`);
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
    (account) => account.name === name && account.enabled && account.assumable
  );
  if (existing) return existing.id;
  if (accounts.some((account) => account.name === name)) {
    throw new Error(`Service account ${name} is disabled or not assumable`);
  }
  const roleName = await findBuiltInWorkerRole(fetch, name);
  const created = await fetch<Account>(ACCOUNTS_URL, {
    method: 'POST',
    body: JSON.stringify({
      name,
      roles: [roleName],
      description: 'Rule-tuning eval worker',
    }),
  });
  if (!created.id) throw new Error(`Service account ${name} was created without an id`);
  return created.id;
};

export interface BoundWorker {
  workflowId: string;
  /**
   * True when this bind flipped the worker from disabled to enabled. Enabling schedules the
   * worker's interval task, and Task Manager makes an interval task's first run due
   * immediately (`getFirstRunAt` returns now) whatever `scheduleInterval` is, so a scheduled
   * tick fires right after the bind and dispatches its own global sweep.
   */
  enabledByBind: boolean;
}

/** Bind the per-space entry point; the global sweep can only inherit from this worker. */
export const bindRuleTuningWorker = async (fetch: HttpHandler): Promise<BoundWorker> => {
  const { workers } = await fetch<{ workers: Worker[] }>(WORKERS_URL, {
    ...INTERNAL_OPTIONS,
    method: 'GET',
  });
  const worker = workers.find(({ id }) => id === RULE_TUNING_WORKER_ID);
  if (!worker) throw new Error(`Worker ${RULE_TUNING_WORKER_ID} is absent from the catalog`);
  const serviceAccountId = worker.settings.serviceAccountId ?? (await ensureAccount(fetch));
  const wasEnabled = worker.enabled;
  await fetch(`${WORKERS_URL}/${RULE_TUNING_WORKER_ID}`, {
    ...INTERNAL_OPTIONS,
    method: 'PATCH',
    body: JSON.stringify({
      enabled: true,
      settingsRevision: worker.settingsRevision,
      settings: {
        serviceAccountId,
        autonomy: 'assisted',
        // Only pushes the second scheduled tick out of the run. The first one fires on enable
        // regardless (see BoundWorker.enabledByBind) and the harness drains it.
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
  return { workflowId: bound.workflowId, enabledByBind: !wasEnabled };
};
