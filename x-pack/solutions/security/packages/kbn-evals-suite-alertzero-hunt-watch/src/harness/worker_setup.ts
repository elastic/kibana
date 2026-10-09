/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Installs and enables the Continuous Threat Hunt Worker before phase E0.
 * The managed Worker ships `enabled: false`, installation is per space, and
 * enabling needs a service account (workers_service.ts: "a worker that is
 * enabled without a service account"). Without this the manual run route
 * answers 400 "Workflow is disabled".
 *
 * Paths and the role payload are inlined (packages expose one public entry
 * point; the plugin's `worker_roles.ts` is not importable). The payload mirrors
 * WORKER_ROLE_DEFINITIONS for the hunt Worker; the privileges are the same
 * the product grants when a user clicks "Enable".
 */

export const HUNT_WORKER_ID = 'system-security-hunt-continuous-threat-hunt';
export const HUNT_WORKER_ACCOUNT_NAME = 'alertzero_threat_hunt';

const WORKERS_URL = '/internal/alertzero/workers';
const SERVICE_ACCOUNT_URL = '/internal/security/service_account';
const SECURITY_ROLE_API_VERSION = '2023-10-31';
const INTERNAL_HEADERS = {
  'elastic-api-version': '1',
  'x-elastic-internal-origin': 'Kibana',
  'kbn-xsrf': 'true',
};

const SECURITY_DATA_PATTERNS = [
  'apm-*-transaction*',
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'traces-apm*',
  'winlogbeat-*',
];

export const HUNT_WORKER_ROLE = {
  description:
    'Privileges for the AlertZero Continuous Threat Hunt worker. Created by the hunt_watch eval.',
  elasticsearch: {
    cluster: ['monitor_inference'],
    indices: [
      {
        names: ['ai-index-idx-security-investigations'],
        privileges: ['read', 'view_index_metadata', 'index', 'auto_configure'],
      },
      { names: ['.ai-index-idx-elastic-index'], privileges: ['read', 'view_index_metadata'] },
      { names: SECURITY_DATA_PATTERNS, privileges: ['read'] },
    ],
    run_as: [],
  },
  kibana: [
    {
      spaces: ['*'],
      base: [],
      feature: {
        alertzero: ['all'],
        agentBuilder: ['read'],
        contextEngine: ['all'],
        proposals: ['all'],
        actions: ['read'],
        siemV5: [
          'minimal_read',
          'host_isolation_all',
          'process_operations_all',
          'actions_log_management_read',
        ],
      },
    },
  ],
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

const isConflict = (e: unknown): boolean => {
  const status = (e as { response?: { status?: number } })?.response?.status;
  return status === 409;
};

export const ensureHuntWorkerEnabled = async (
  kbnClient: KbnClient,
  log: ToolingLog
): Promise<{ serviceAccountId: string }> => {
  // 1. role (createOnly: an existing role is reused, never overwritten)
  try {
    await kbnClient.request({
      path: `/api/security/role/${encodeURIComponent(HUNT_WORKER_ACCOUNT_NAME)}`,
      method: 'PUT',
      headers: { 'elastic-api-version': SECURITY_ROLE_API_VERSION, 'kbn-xsrf': 'true' },
      query: { createOnly: true },
      body: HUNT_WORKER_ROLE,
    });
  } catch (e) {
    if (!isConflict(e)) throw e;
  }

  // 2. service account, found by name first
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
    const created = await kbnClient.request<{ id: string }>({
      path: SERVICE_ACCOUNT_URL,
      method: 'POST',
      headers: { 'x-elastic-internal-origin': 'Kibana', 'kbn-xsrf': 'true' },
      body: {
        name: HUNT_WORKER_ACCOUNT_NAME,
        description: 'Service account for the hunt_watch eval',
        roles: [HUNT_WORKER_ACCOUNT_NAME],
      },
    });
    serviceAccountId = created.data.id;
  }

  // 3. enable, with the current settings revision (optimistic concurrency)
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

  // 4. assert, never assume
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
