/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as randomUUID } from 'uuid';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { buildPolicyIdKuery } from '@kbn/osquery-plugin/common/utils/build_policy_id_kuery';

const PACKAGE_PATH = '/api/fleet/epm/packages/osquery_manager';
export interface OsqueryTrapResources {
  agentPolicyId?: string;
  packagePolicyId?: string;
  packageInstalledByTrap: boolean;
}

async function getOsqueryPolicyIds(kbnClient: KbnClient): Promise<string[]> {
  const ids = new Set<string>();
  for (let page = 1; ; page++) {
    const { data } = await kbnClient.request<{
      items: Array<{ policy_id?: string; policy_ids?: string[] }>;
      total: number;
    }>({
      method: 'GET',
      path: '/api/fleet/package_policies',
      query: { page, perPage: 100, kuery: 'ingest-package-policies.package.name:osquery_manager' },
    });
    for (const policy of data.items) {
      for (const id of policy.policy_ids ?? (policy.policy_id ? [policy.policy_id] : []))
        ids.add(id);
    }
    if (!Number.isInteger(data.total) || data.total < 0) {
      throw new Error('Invalid Osquery package-policy total');
    }
    if (page * 100 >= data.total) return [...ids];
    if (!data.items.length) throw new Error('Incomplete Osquery package-policy pagination');
  }
}

/** Verify the same space-wide, version-aware agent population used by check_integration. */
export async function assertOsqueryTrapHasNoAgents(kbnClient: KbnClient): Promise<void> {
  const policyIds = await getOsqueryPolicyIds(kbnClient);
  if (!policyIds.length) return;
  const { data } = await kbnClient.request<{ total: number }>({
    method: 'GET',
    path: '/api/fleet/agents',
    query: {
      perPage: 0,
      showInactive: false,
      kuery: `(${buildPolicyIdKuery(
        policyIds
      )}) and status:(online or offline or enrolling or updating)`,
    },
  });
  if (data.total !== 0) {
    throw new Error(
      `Osquery trap requires zero executable agents across all Osquery policies; found ${data.total}`
    );
  }
}

/** Own only newly created policies. Installing the global package requires isolated-stack consent. */
export async function seedOsqueryInstalledNoAgents(
  kbnClient: KbnClient,
  log: ToolingLog,
  options: {
    allowPackageInstall?: boolean;
    persistResources?: (resources: OsqueryTrapResources) => Promise<void>;
  } = {}
): Promise<OsqueryTrapResources> {
  const resources: OsqueryTrapResources = { packageInstalledByTrap: false };
  const { data } = await kbnClient.request<{ item: { status: string; version?: string } }>({
    method: 'GET',
    path: PACKAGE_PATH,
  });
  await assertOsqueryTrapHasNoAgents(kbnClient);
  if (data.item.status !== 'installed' && !options.allowPackageInstall) {
    throw new Error(
      'Osquery trap needs an installed package or allowPackageInstall on an isolated stack'
    );
  }
  try {
    if (data.item.status !== 'installed') {
      // Record intent before a write: a failed response may still have installed the package.
      resources.packageInstalledByTrap = true;
      await options.persistResources?.({ ...resources });
      await kbnClient.request({ method: 'POST', path: PACKAGE_PATH, body: { force: true } });
    }
    const installed =
      data.item.status === 'installed'
        ? data
        : (
            await kbnClient.request<{ item: { version?: string } }>({
              method: 'GET',
              path: PACKAGE_PATH,
            })
          ).data;
    const version = installed.item.version;
    if (!version) throw new Error('osquery_manager install did not expose a package version');
    resources.agentPolicyId = randomUUID();
    await options.persistResources?.({ ...resources });
    await kbnClient.request({
      method: 'POST',
      path: '/api/fleet/agent_policies',
      body: {
        id: resources.agentPolicyId,
        name: `eval-osquery-trap-${resources.agentPolicyId}`,
        namespace: 'default',
        monitoring_enabled: [],
        is_default: false,
        is_default_fleet_server: false,
      },
    });
    resources.packagePolicyId = randomUUID();
    await options.persistResources?.({ ...resources });
    await kbnClient.request({
      method: 'POST',
      path: '/api/fleet/package_policies',
      body: {
        id: resources.packagePolicyId,
        name: `eval-osquery-trap-pkg-${resources.packagePolicyId}`,
        namespace: 'default',
        policy_id: resources.agentPolicyId,
        package: { name: 'osquery_manager', version },
        inputs: { osquery: { enabled: true, streams: {} } },
      },
    });
    await assertOsqueryTrapHasNoAgents(kbnClient);
    log.info(
      `Osquery trap seeded: agentPolicy=${resources.agentPolicyId}, packagePolicy=${resources.packagePolicyId}`
    );
    return resources;
  } catch (error) {
    try {
      await cleanupOsqueryInstalledNoAgents(kbnClient, resources, log);
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Osquery trap setup and rollback failed');
    }
    throw error;
  }
}

export async function cleanupOsqueryInstalledNoAgents(
  kbnClient: KbnClient,
  resources: OsqueryTrapResources,
  log: ToolingLog
): Promise<void> {
  const errors: unknown[] = [];
  async function attempt(cleanup: () => Promise<unknown>) {
    try {
      await cleanup();
    } catch (error) {
      errors.push(error);
      log.warning(`Osquery trap cleanup failed: ${error}`);
    }
  }
  if (resources.packagePolicyId)
    await attempt(() =>
      kbnClient.request({
        method: 'POST',
        path: '/api/fleet/package_policies/delete',
        body: { packagePolicyIds: [resources.packagePolicyId] },
      })
    );
  if (resources.agentPolicyId)
    await attempt(() =>
      kbnClient.request({
        method: 'POST',
        path: '/api/fleet/agent_policies/delete',
        body: { agentPolicyId: resources.agentPolicyId },
      })
    );
  if (resources.packageInstalledByTrap)
    await attempt(async () => {
      const policyIds = await getOsqueryPolicyIds(kbnClient);
      if (policyIds.length)
        throw new Error('Refusing to uninstall Osquery while other policies reference it');
      await kbnClient.request({ method: 'DELETE', path: PACKAGE_PATH });
    });
  if (errors.length) throw new AggregateError(errors, 'Osquery trap cleanup failed');
}
