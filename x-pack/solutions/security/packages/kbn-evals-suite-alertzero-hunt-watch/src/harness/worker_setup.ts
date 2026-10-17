/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KbnClientRequesterError, type KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  SECURITY_ROLE_API_VERSION,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  WORKER_SERVICE_ACCOUNT_NAMES,
  buildSecurityRoleUrl,
  getWorkerRoleName,
} from '@kbn/alertzero-common';

/**
 * Installs and enables the Continuous Threat Hunt Worker before phase E0.
 * The managed Worker ships `enabled: false`, installation is per space, and
 * enabling needs a service account (workers_service.ts: "a worker that is
 * enabled without a service account"). Without this the manual run route
 * answers 400 "Workflow is disabled".
 *
 * The service account's role is built in (an Elasticsearch reserved role on
 * stateful, a predefined role on Serverless). This harness only looks it up
 * and never creates or changes a role.
 */

export const HUNT_WORKER_ID = SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID;
export const HUNT_WORKER_ACCOUNT_NAME = WORKER_SERVICE_ACCOUNT_NAMES[HUNT_WORKER_ID];

const WORKERS_URL = '/internal/alertzero/workers';
const SERVICE_ACCOUNT_URL = '/internal/security/service_account';
const INTERNAL_HEADERS = {
  'elastic-api-version': '1',
  'x-elastic-internal-origin': 'Kibana',
  'kbn-xsrf': 'true',
};

interface ServiceAccountEntry {
  id: string;
  name: string;
  enabled: boolean;
  assumable: boolean;
}

interface WorkerEntry {
  id: string;
  enabled: boolean;
  settingsRevision: number | null;
  settings?: { serviceAccountId?: string };
  blockingReasons?: unknown[];
}

/** `KbnClientRequesterError` carries the HTTP status on `.status` (there is no `.response`). */
const isNotFound = (e: unknown): boolean =>
  e instanceof KbnClientRequesterError && e.status === 404;

const isServerlessDeployment = async (kbnClient: KbnClient): Promise<boolean> => {
  const status = await kbnClient.request<{ version?: { build_flavor?: string } }>({
    path: '/api/status',
    method: 'GET',
  });
  return status.data.version?.build_flavor === 'serverless';
};

/** Returns the built-in role name, or throws naming it when this stack lacks the role. */
const findBuiltInRole = async (kbnClient: KbnClient): Promise<string> => {
  const isServerless = await isServerlessDeployment(kbnClient);
  const roleName = getWorkerRoleName(HUNT_WORKER_ACCOUNT_NAME, { isServerless });
  const missing = () =>
    new Error(
      `[hunt-watch] built-in ${
        isServerless ? 'predefined' : 'reserved'
      } role ${roleName} is missing on this stack; the eval does not create worker roles`
    );
  let role: { metadata?: { _reserved?: unknown } };
  try {
    role = (
      await kbnClient.request<{ metadata?: { _reserved?: unknown } }>({
        path: buildSecurityRoleUrl(roleName),
        method: 'GET',
        headers: { 'elastic-api-version': SECURITY_ROLE_API_VERSION },
      })
    ).data;
  } catch (e) {
    throw isNotFound(e) ? missing() : e;
  }
  if (role.metadata?._reserved !== true) throw missing();
  return roleName;
};

export const ensureHuntWorkerEnabled = async (
  kbnClient: KbnClient,
  log: ToolingLog
): Promise<{ serviceAccountId: string }> => {
  // 1. service account, found by name first
  const accounts: ServiceAccountEntry[] = [];
  let after: string | undefined;
  do {
    const page = await kbnClient.request<{
      serviceAccounts: ServiceAccountEntry[];
      nextPage?: string;
    }>({
      path: SERVICE_ACCOUNT_URL,
      method: 'GET',
      headers: { 'x-elastic-internal-origin': 'Kibana' },
      query: after ? { after } : {},
    });
    accounts.push(...page.data.serviceAccounts);
    after = page.data.nextPage;
  } while (after);
  const usable = accounts.find(
    (a) => a.name === HUNT_WORKER_ACCOUNT_NAME && a.enabled && a.assumable
  );
  let serviceAccountId = usable?.id;
  if (!serviceAccountId) {
    const roleName = await findBuiltInRole(kbnClient);
    const created = await kbnClient.request<{ id: string }>({
      path: SERVICE_ACCOUNT_URL,
      method: 'POST',
      headers: { 'x-elastic-internal-origin': 'Kibana', 'kbn-xsrf': 'true' },
      body: {
        name: HUNT_WORKER_ACCOUNT_NAME,
        description: 'Service account for the hunt_watch eval',
        roles: [roleName],
      },
    });
    serviceAccountId = created.data.id;
  }

  // 2. enable, with the current settings revision (optimistic concurrency)
  const worker = await readWorker(kbnClient);
  if (!(worker.enabled && worker.settings?.serviceAccountId === serviceAccountId)) {
    await kbnClient.request({
      path: `${WORKERS_URL}/${encodeURIComponent(HUNT_WORKER_ID)}`,
      method: 'PATCH',
      headers: INTERNAL_HEADERS,
      body: {
        enabled: true,
        settingsRevision: worker.settingsRevision,
        settings: { serviceAccountId },
      },
    });
  }

  // 3. assert, never assume
  const after2 = await readWorker(kbnClient);
  if (!after2.enabled) {
    throw new Error(
      `[hunt-watch] hunt Worker is not enabled after setup (blockingReasons: ${JSON.stringify(
        after2.blockingReasons ?? []
      )})`
    );
  }
  log.info(`[hunt-watch] hunt Worker enabled with service account ${serviceAccountId}`);
  return { serviceAccountId };
};

const readWorker = async (kbnClient: KbnClient): Promise<WorkerEntry> => {
  const list = await kbnClient.request<{ workers: WorkerEntry[] }>({
    path: WORKERS_URL,
    method: 'GET',
    headers: INTERNAL_HEADERS,
  });
  const worker = list.data.workers.find((w) => w.id === HUNT_WORKER_ID);
  if (!worker) throw new Error(`[hunt-watch] Worker ${HUNT_WORKER_ID} is not registered`);
  return worker;
};
