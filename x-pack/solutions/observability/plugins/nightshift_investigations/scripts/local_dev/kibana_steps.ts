/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as sleep } from 'timers/promises';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  createHttpServiceAccountsApi,
  ensureNightshiftServiceAccountRoles,
  ensureNightshiftServiceAccounts,
} from '@kbn/nightshift-shared';
import {
  CUSTOM_CONTEXT_API_PATH,
  NIGHTSHIFT_INVESTIGATION_AGENT_ID,
  SANDBOX_ALLOWLIST_API_PATH,
  type GetCustomContextResponse,
  type GetSandboxAllowlistResponse,
  type PutCustomContextRequest,
} from '../../common';
import { SANDBOX_CONNECTORS_API_PATH } from '../../common/sandbox_connectors';
import type { GetSandboxConnectorsResponse } from '../../common/sandbox_connectors';
import {
  ORCA_CONNECTOR_ID,
  ORCA_CONNECTOR_NAME,
  ORCA_SANDBOX_ALLOWED_HOSTS,
  ORCA_SOURCE_CODE_CONTEXT,
} from './constants';
import { getHttpStatus, type JsonRequest } from './http_client';
import type { OrcaConnection } from './secrets';

const PUBLIC_API_VERSION = '2023-10-31';
const AGENT_PATH = `/api/agent_builder/agents/${encodeURIComponent(
  NIGHTSHIFT_INVESTIGATION_AGENT_ID
)}`;
const CONNECTOR_PATH = `/api/actions/connector/${ORCA_CONNECTOR_ID}`;

interface KibanaStatus {
  /** Missing when the request is not authenticated. */
  version?: { number: string; build_flavor?: string };
  status: { overall: { level: string } };
  metrics?: { process?: { uptime_in_millis?: number } };
}

const poll = async <T>(
  attempt: () => Promise<T | undefined>,
  { timeoutMs, intervalMs }: { timeoutMs: number; intervalMs: number }
): Promise<T | undefined> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await attempt().catch(() => undefined);
    if (result !== undefined) return result;
    await sleep(intervalMs);
  }
  return undefined;
};

/**
 * Waits until Kibana answers as available. With `startedAfter`, it also waits for a server process
 * that started after that time: `kibana --dev` restarts when its config changes, and the old
 * process can answer for a while after the change.
 */
export const waitForKibana = async (
  kibana: JsonRequest,
  log: ToolingLog,
  { startedAfter, timeoutMs = 10 * 60_000 }: { startedAfter?: number; timeoutMs?: number } = {}
): Promise<KibanaStatus> => {
  log.info(
    startedAfter
      ? 'Waiting for Kibana to restart with the new config...'
      : 'Waiting for Kibana to be available...'
  );
  const status = await poll(
    async () => {
      const current = await kibana<KibanaStatus>('/api/status');
      if (current.status.overall.level !== 'available') return undefined;
      // Without credentials Kibana answers with the overall level only, and no uptime.
      if (!current.version) return current;
      const uptime = current.metrics?.process?.uptime_in_millis;
      // A few seconds of slack: the restart begins right after the write.
      if (startedAfter && uptime !== undefined && Date.now() - uptime < startedAfter - 5_000) {
        return undefined;
      }
      return current;
    },
    { timeoutMs, intervalMs: 3_000 }
  );
  if (!status) {
    throw new Error(
      startedAfter
        ? 'Kibana did not restart with the new config in time. Is it running in dev mode? Start it, then re-run with --connector-only.'
        : 'Kibana is not available. Start it, then re-run with --connector-only.'
    );
  }
  if (!status.version) {
    throw new Error('Kibana rejects the --kibana-auth credentials');
  }
  return status;
};

export const isServerless = ({ version }: KibanaStatus): boolean =>
  version?.build_flavor === 'serverless';

/** The External Elasticsearch connector needs an enterprise license; a trial includes it. */
export const assertEnterpriseLicense = async (kibana: JsonRequest): Promise<void> => {
  const { license } = await kibana<{ license?: { type?: string; status?: string } }>(
    '/api/licensing/info'
  );
  const type = license?.type;
  if (license?.status !== 'active' || !(type === 'enterprise' || type === 'trial')) {
    throw new Error(
      `The ORCA connector needs an active enterprise or trial license; this cluster has ${
        type ?? 'none'
      } (${
        license?.status ?? 'unknown'
      }). Start Elasticsearch with \`pnpm es snapshot --eis\`, which includes a trial license.`
    );
  }
};

/**
 * Sets the default space up for Nightshift as the app's onboarding does: the service account
 * roles (stateful only), the service accounts, and the bound investigation workflow.
 */
export const enableNightshiftSpace = async ({
  kibana,
  elasticsearch,
  log,
}: {
  kibana: JsonRequest;
  elasticsearch: JsonRequest;
  log: ToolingLog;
}): Promise<void> => {
  await ensureNightshiftServiceAccountRoles(
    {
      security: {
        putRole: ({ name, ...role }) =>
          elasticsearch(`/_security/role/${encodeURIComponent(name)}`, {
            method: 'PUT',
            body: role,
          }),
      },
    },
    { isServerless: false }
  );
  const serviceAccountIds = await ensureNightshiftServiceAccounts(
    createHttpServiceAccountsApi({ request: kibana, getStatus: getHttpStatus }),
    { isServerless: false }
  );
  let lastError: unknown;
  const enabled = await poll(
    async () => {
      try {
        const { installed, bound } = await kibana<{ installed: boolean; bound: boolean }>(
          '/internal/nightshift/investigations/service_account/_enable',
          { method: 'POST', body: { serviceAccountIds } }
        );
        return installed && bound ? true : undefined;
      } catch (error) {
        lastError = error;
        throw error;
      }
    },
    // The managed workflows plugin can take a while after a cold start.
    { timeoutMs: 120_000, intervalMs: 5_000 }
  );
  if (!enabled) {
    throw new Error(
      `Could not bind the default space to the Nightshift service accounts${
        lastError ? `: ${(lastError as Error).message}` : ''
      }`
    );
  }
  log.success('Default space bound to the Nightshift service accounts');
};

/** Creates the ORCA connector, or replaces the key of an existing one. */
export const saveOrcaConnector = async (
  kibana: JsonRequest,
  { url, apiKey }: OrcaConnection
): Promise<'created' | 'updated'> => {
  const connector = {
    name: ORCA_CONNECTOR_NAME,
    // As the eval's ORCA connector: the investigator reaches it from its sandbox, not as a tool.
    config: { url, selectedActions: ['_test'] },
    secrets: { authType: 'api_key_header', Authorization: `ApiKey ${apiKey}` },
  };
  const exists = await kibana(CONNECTOR_PATH).then(
    () => true,
    (error) => {
      if (getHttpStatus(error) === 404) return false;
      throw error;
    }
  );
  if (exists) {
    await kibana(CONNECTOR_PATH, { method: 'PUT', body: connector });
    return 'updated';
  }
  await kibana(CONNECTOR_PATH, {
    method: 'POST',
    body: { ...connector, connector_type_id: '.elasticsearch' },
  });
  return 'created';
};

interface AgentResponse {
  configuration?: { connector_ids?: string[] } & Record<string, unknown>;
}

/** Adds or removes the ORCA connector on the investigator, keeping its other connectors. */
export const updateInvestigatorConnectors = async (
  kibana: JsonRequest,
  action: 'add' | 'remove'
): Promise<boolean> => {
  const { configuration = {} } = await kibana<AgentResponse>(AGENT_PATH, {
    version: PUBLIC_API_VERSION,
  });
  const current = configuration.connector_ids ?? [];
  const next =
    action === 'add'
      ? [...new Set([...current, ORCA_CONNECTOR_ID])]
      : current.filter((id) => id !== ORCA_CONNECTOR_ID);
  if (next.length === current.length) return false;
  await kibana(AGENT_PATH, {
    method: 'PUT',
    version: PUBLIC_API_VERSION,
    body: { configuration: { ...configuration, connector_ids: next } },
  });
  return true;
};

export const deleteOrcaConnector = async (kibana: JsonRequest): Promise<boolean> =>
  kibana(CONNECTOR_PATH, { method: 'DELETE' }).then(
    () => true,
    (error) => {
      if (getHttpStatus(error) === 404) return false;
      throw error;
    }
  );

/**
 * Gives the space what the ORCA evals give theirs: the custom context pointing at the demo's source
 * code, and the sandbox egress to clone it. Snippets and hosts already in the space stay.
 */
export const addOrcaSpaceContext = async (
  kibana: JsonRequest
): Promise<{ addedContext: boolean; addedHosts: string[] }> => {
  const context = await kibana<GetCustomContextResponse>(CUSTOM_CONTEXT_API_PATH);
  const addedContext = !context.snippets.some(({ text }) => text === ORCA_SOURCE_CODE_CONTEXT);
  if (addedContext) {
    const body: PutCustomContextRequest = {
      snippets: [
        ...context.snippets.map(({ id, text }) => ({ id, text })),
        { text: ORCA_SOURCE_CODE_CONTEXT },
      ],
      version: context.version,
    };
    await kibana(CUSTOM_CONTEXT_API_PATH, { method: 'PUT', body });
  }
  const { hosts } = await kibana<GetSandboxAllowlistResponse>(SANDBOX_ALLOWLIST_API_PATH);
  const addedHosts = ORCA_SANDBOX_ALLOWED_HOSTS.filter((host) => !hosts.includes(host));
  if (addedHosts.length > 0) {
    await kibana(SANDBOX_ALLOWLIST_API_PATH, {
      method: 'PUT',
      body: { hosts: [...hosts, ...addedHosts] },
    });
  }
  return { addedContext, addedHosts };
};

/** Removes the ORCA snippet and the hosts it needs from the space. */
export const removeOrcaSpaceContext = async (kibana: JsonRequest): Promise<void> => {
  const context = await kibana<GetCustomContextResponse>(CUSTOM_CONTEXT_API_PATH);
  const snippets = context.snippets.filter(({ text }) => text !== ORCA_SOURCE_CODE_CONTEXT);
  if (snippets.length !== context.snippets.length) {
    const body: PutCustomContextRequest = {
      snippets: snippets.map(({ id, text }) => ({ id, text })),
      version: context.version,
    };
    await kibana(CUSTOM_CONTEXT_API_PATH, { method: 'PUT', body });
  }
  const { hosts } = await kibana<GetSandboxAllowlistResponse>(SANDBOX_ALLOWLIST_API_PATH);
  const kept = hosts.filter((host) => !ORCA_SANDBOX_ALLOWED_HOSTS.includes(host));
  if (kept.length !== hosts.length) {
    await kibana(SANDBOX_ALLOWLIST_API_PATH, { method: 'PUT', body: { hosts: kept } });
  }
};

export interface Verification {
  available: boolean;
  connectorListed: boolean;
  /** Whether the investigator's saved configuration holds the ORCA connector. */
  connectorOnInvestigator: boolean;
  /** Whether the space holds the ORCA source code context and its sandbox egress. */
  spaceContext: boolean;
  orcaLogCount?: number;
}

export const verifySetup = async ({
  kibana,
  orca,
}: {
  kibana: JsonRequest;
  orca: OrcaConnection;
}): Promise<Verification> => {
  const available =
    (await poll(
      async () =>
        (
          await kibana<{ available: boolean }>('/internal/nightshift/investigations/availability')
        ).available || undefined,
      { timeoutMs: 60_000, intervalMs: 5_000 }
    )) ?? false;
  const { connectors } = await kibana<GetSandboxConnectorsResponse>(SANDBOX_CONNECTORS_API_PATH);
  const { configuration } = await kibana<AgentResponse>(AGENT_PATH, {
    version: PUBLIC_API_VERSION,
  });
  const context = await kibana<GetCustomContextResponse>(CUSTOM_CONTEXT_API_PATH);
  const { hosts } = await kibana<GetSandboxAllowlistResponse>(SANDBOX_ALLOWLIST_API_PATH);
  const spaceContext =
    context.snippets.some(({ text }) => text === ORCA_SOURCE_CODE_CONTEXT) &&
    ORCA_SANDBOX_ALLOWED_HOSTS.every((host) => hosts.includes(host));
  const response = await fetch(`${orca.url}/logs-orcabench.otel-*/_count`, {
    headers: { Authorization: `ApiKey ${orca.apiKey}` },
  });
  const orcaLogCount = response.ok
    ? ((await response.json()) as { count: number }).count
    : undefined;
  return {
    available,
    connectorListed: connectors.some(({ id }) => id === ORCA_CONNECTOR_ID),
    connectorOnInvestigator: (configuration?.connector_ids ?? []).includes(ORCA_CONNECTOR_ID),
    spaceContext,
    orcaLogCount,
  };
};
