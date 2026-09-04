/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';

const OSQUERY_PACKAGE = 'osquery_manager';

/**
 * Seeds the "Osquery installed but no agents enrolled" trap state used by the
 * capability-detection load-bearing scenario.
 *
 * The trap distinguishes two answers that look identical to an agent that
 * never probes: "Osquery not installed" vs "Osquery installed but no host can
 * run a live query". Both end on the ES|QL path, but the capability claim in
 * the answer differs — and only `check_integration` reveals which is true.
 *
 * We install the osquery_manager package and attach it to a fresh, empty
 * agent policy. No Fleet agent ever enrolls in that policy, so the stack is
 * `installed: true, agents_enrolled: false` — exactly the state the trap
 * needs. Returns a teardown handle that removes the package policy and
 * uninstalls the package so the suite returns to its prior state.
 */
export async function seedOsqueryInstalledNoAgents(
  kbnClient: KbnClient,
  log: ToolingLog
): Promise<{ agentPolicyId: string; packagePolicyId: string }> {
  await kbnClient.request({
    method: 'POST',
    path: `/api/fleet/epm/packages/${OSQUERY_PACKAGE}`,
    body: { force: true },
  });

  // The package_policies API requires the installed package version and an
  // inputs object keyed by input name (not an array).
  const installed = await kbnClient.request<{ item?: { version?: string } }>({
    method: 'GET',
    path: `/api/fleet/epm/packages/${OSQUERY_PACKAGE}`,
  });
  const version = installed.data?.item?.version;
  if (!version) {
    throw new Error(`osquery_manager install did not report a version`);
  }

  // Unique names: the eval runs one worker per model concurrently, and a fixed
  // name collides with a 409 on the second worker.
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const name = `eval-osquery-no-agents-trap-${suffix}`;

  const agentPolicy = await kbnClient.request<{ item: { id: string } }>({
    method: 'POST',
    path: '/api/fleet/agent_policies',
    body: {
      name,
      namespace: 'default',
      description: 'Eval trap: Osquery installed, no agents enrolled',
      monitoring_enabled: [],
    },
  });
  const agentPolicyId = agentPolicy.data.item.id;

  const packagePolicy = await kbnClient.request<{ item: { id: string } }>({
    method: 'POST',
    path: '/api/fleet/package_policies',
    body: {
      name,
      namespace: 'default',
      policy_id: agentPolicyId,
      package: { name: OSQUERY_PACKAGE, version },
      inputs: {},
    },
  });
  const packagePolicyId = packagePolicy.data.item.id;

  log.info(
    `Seeded Osquery trap state: package installed, agent policy ${agentPolicyId} carries osquery_manager, no agents enrolled`
  );

  return { agentPolicyId, packagePolicyId };
}

/** Tears down the trap state seeded by {@link seedOsqueryInstalledNoAgents}. */
export async function cleanupOsqueryInstalledNoAgents(
  kbnClient: KbnClient,
  log: ToolingLog,
  ids: { agentPolicyId: string; packagePolicyId: string }
): Promise<void> {
  try {
    await kbnClient.request({
      method: 'POST',
      path: '/api/fleet/package_policies/delete',
      body: { packagePolicyIds: [ids.packagePolicyId], force: true },
    });
  } catch (e) {
    log.warning(`Failed to delete trap package policy: ${e}`);
  }

  try {
    await kbnClient.request({
      method: 'POST',
      path: '/api/fleet/agent_policies/delete',
      body: { agentPolicyId: ids.agentPolicyId },
    });
  } catch (e) {
    log.warning(`Failed to delete trap agent policy: ${e}`);
  }

  try {
    await kbnClient.request({
      method: 'DELETE',
      path: `/api/fleet/epm/packages/${OSQUERY_PACKAGE}`,
    });
  } catch (e) {
    log.warning(`Failed to uninstall osquery_manager: ${e}`);
  }
}
