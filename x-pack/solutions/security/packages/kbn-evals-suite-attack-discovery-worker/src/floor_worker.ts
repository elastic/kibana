/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ALERTZERO_WORKERS_URL,
  API_VERSIONS,
  SECURITY_ROLE_API_VERSION,
  SECURITY_SERVICE_ACCOUNT_URL,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  WORKER_SERVICE_ACCOUNT_NAMES,
  buildSecurityRoleUrl,
  buildWorkerUrl,
  getWorkerRoleName,
} from '@kbn/alertzero-common';
import { EVAL_SPACE_ID, FLOOR_SCHEDULE_INTERVAL } from './constants';
import { apiVersion, errorMessage, httpStatus, sleep, spacePath } from './kibana_api';

export const FLOOR_WORKER_ID = SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID;

/** The built-in service account (and, on stateful, the reserved role of the same name). */
export const FLOOR_SERVICE_ACCOUNT_NAME = WORKER_SERVICE_ACCOUNT_NAMES[FLOOR_WORKER_ID];

const LIST_PAGE_SIZE = 100;
const CONFLICT_LOOKUP_ATTEMPTS = 5;
const CONFLICT_LOOKUP_DELAY_MS = 500;

interface ServiceAccountEntry {
  id: string;
  name: string;
  enabled?: boolean;
  assumable?: boolean;
}

interface WorkerEntry {
  id: string;
  enabled: boolean;
  settings?: { serviceAccountId?: string | null; autonomy?: string; scheduleInterval?: string };
  settingsRevision?: number | null;
  workflowId?: string;
  blockingReasons?: string[];
}

const listServiceAccounts = async (fetch: HttpHandler): Promise<ServiceAccountEntry[]> => {
  const accounts: ServiceAccountEntry[] = [];
  let after: string | undefined;
  do {
    const page: { serviceAccounts: ServiceAccountEntry[]; nextPage?: string | null } = await fetch(
      SECURITY_SERVICE_ACCOUNT_URL,
      { method: 'GET', query: { limit: LIST_PAGE_SIZE, ...(after ? { after } : {}) } }
    );
    accounts.push(...page.serviceAccounts);
    after = page.nextPage ?? undefined;
  } while (after);
  return accounts;
};

const findUsable = (accounts: readonly ServiceAccountEntry[], name: string) =>
  accounts.find((account) => account.name === name && account.enabled && account.assumable);

/**
 * Finds the floor worker's built-in service account, creating it with the built-in role when it
 * does not exist. This is the production flow: the role is Elasticsearch's own reserved role
 * and is never created or changed here.
 */
export const ensureFloorServiceAccount = async (
  fetch: HttpHandler,
  log: ToolingLog
): Promise<string> => {
  const name = FLOOR_SERVICE_ACCOUNT_NAME;
  const existing = findUsable(await listServiceAccounts(fetch), name);
  if (existing) return existing.id;

  const role = getWorkerRoleName(name, { isServerless: false });
  const roleDocument = await fetch<{ metadata?: { _reserved?: unknown } }>(
    buildSecurityRoleUrl(role),
    { method: 'GET', headers: apiVersion(SECURITY_ROLE_API_VERSION) }
  ).catch((error) => {
    throw new Error(
      `The built-in role "${role}" is not readable (${errorMessage(
        error
      )}). The eval stack must ship the reserved Attack Discovery worker role.`
    );
  });
  if (roleDocument.metadata?._reserved !== true) {
    throw new Error(
      `Role "${role}" exists but is not a reserved built-in role; refusing to use it.`
    );
  }

  try {
    const { id } = await fetch<{ id: string }>(SECURITY_SERVICE_ACCOUNT_URL, {
      method: 'POST',
      body: JSON.stringify({
        name,
        description:
          'Runs the Attack Discovery worker (created by the Attack Discovery Worker evals)',
        roles: [role],
      }),
    });
    log.info(`[ad-worker] created service account "${name}" (${id}) with role "${role}"`);
    return id;
  } catch (error) {
    if (httpStatus(error) !== 409) throw error;
  }
  // A concurrent create lists the account before its credential exists, so wait for it.
  for (let attempt = 0; attempt < CONFLICT_LOOKUP_ATTEMPTS; attempt++) {
    await sleep(CONFLICT_LOOKUP_DELAY_MS);
    const found = findUsable(await listServiceAccounts(fetch), name);
    if (found) return found.id;
  }
  throw new Error(`Service account "${name}" was created concurrently but never became usable.`);
};

const readFloorWorker = async (fetch: HttpHandler, spaceId: string): Promise<WorkerEntry> => {
  const { workers } = await fetch<{ workers: WorkerEntry[] }>(
    spacePath(spaceId, ALERTZERO_WORKERS_URL),
    { method: 'GET', headers: apiVersion(API_VERSIONS.internal.v1) }
  );
  const worker = workers.find(({ id }) => id === FLOOR_WORKER_ID);
  if (!worker) {
    throw new Error(`The AlertZero worker catalog does not list "${FLOOR_WORKER_ID}".`);
  }
  return worker;
};

const patchFloorWorker = async (
  fetch: HttpHandler,
  spaceId: string,
  body: Record<string, unknown>
): Promise<void> => {
  await fetch(spacePath(spaceId, buildWorkerUrl(FLOOR_WORKER_ID)), {
    method: 'PATCH',
    headers: apiVersion(API_VERSIONS.internal.v1),
    body: JSON.stringify(body),
  });
};

export interface EnabledFloorWorker {
  /** Id of the per-space managed workflow that a run is started from. */
  workflowId: string;
  /** Puts the worker back as it was found. */
  restore: () => Promise<void>;
}

/**
 * Enables the per-space floor worker, bound to its service account and set to manual autonomy,
 * so a run starts the way production starts it: the worker dispatches the runner as its
 * `run_as` identity. The schedule interval is long so no tick starts a run (and cancels the
 * manual one: the worker's concurrency cancels in progress).
 */
export const enableFloorWorker = async ({
  fetch,
  log,
  serviceAccountId,
  spaceId = EVAL_SPACE_ID,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  serviceAccountId: string;
  spaceId?: string;
}): Promise<EnabledFloorWorker> => {
  const before = await readFloorWorker(fetch, spaceId);
  if ((before.blockingReasons ?? []).length > 0) {
    throw new Error(
      `The floor Attack Discovery worker is blocked in "${spaceId}": ${before.blockingReasons?.join(
        ', '
      )}.`
    );
  }
  await patchFloorWorker(fetch, spaceId, {
    enabled: true,
    settingsRevision: before.settingsRevision ?? null,
    settings: {
      serviceAccountId,
      autonomy: 'manual',
      scheduleInterval: FLOOR_SCHEDULE_INTERVAL,
    },
  });
  const after = await readFloorWorker(fetch, spaceId);
  if (!after.enabled || !after.workflowId) {
    throw new Error(
      `The floor Attack Discovery worker did not enable in "${spaceId}" (enabled=${String(
        after.enabled
      )}, workflowId=${String(after.workflowId)}).`
    );
  }
  log.info(`[ad-worker] floor worker enabled as service account ${serviceAccountId}`);
  return {
    workflowId: after.workflowId,
    restore: async () => {
      const current = await readFloorWorker(fetch, spaceId);
      if (before.enabled) {
        // Put back the settings the setup replaced, using the current revision.
        await patchFloorWorker(fetch, spaceId, {
          settingsRevision: current.settingsRevision ?? null,
          settings: before.settings,
        });
        log.info('[ad-worker] floor worker settings restored');
        return;
      }
      await patchFloorWorker(fetch, spaceId, { enabled: false });
      log.info(
        `[ad-worker] floor worker disabled again (revision ${String(current.settingsRevision)})`
      );
    },
  };
};
