/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';

export interface OsqueryLiveQueryReadiness {
  packageInstalled: boolean;
  osqueryAgentPolicyIds: string[];
  onlineOsqueryAgents: number;
}

/**
 * Reports whether the stack can actually execute an Osquery live query.
 *
 * Seeding Defend documents is NOT sufficient for the live-state evals: a live
 * query needs the osquery_manager package installed, an agent policy carrying
 * it, and an online Fleet agent enrolled in that policy. Without this check a
 * run can score the "live state" goldens while no host could ever have
 * responded — the answer would be judged on degradation text, not live data.
 */
export async function getOsqueryLiveQueryReadiness(
  kbnClient: KbnClient,
  log: ToolingLog
): Promise<OsqueryLiveQueryReadiness> {
  const readiness: OsqueryLiveQueryReadiness = {
    packageInstalled: false,
    osqueryAgentPolicyIds: [],
    onlineOsqueryAgents: 0,
  };

  try {
    const installation = await kbnClient.request<{ item?: { status?: string } }>({
      method: 'GET',
      path: '/api/fleet/epm/packages/osquery_manager',
      ignoreErrors: [404],
    });
    readiness.packageInstalled = installation.data?.item?.status === 'installed';
  } catch (e) {
    log.warning(`Could not read osquery_manager installation: ${e}`);

    return readiness;
  }

  if (!readiness.packageInstalled) {
    return readiness;
  }

  try {
    const packagePolicies = await kbnClient.request<{
      items?: Array<{ policy_ids?: string[]; package?: { name?: string } }>;
    }>({
      method: 'GET',
      path: '/api/fleet/package_policies?kuery=ingest-package-policies.package.name:osquery_manager&perPage=100',
    });

    readiness.osqueryAgentPolicyIds = [
      ...new Set(packagePolicies.data?.items?.flatMap((item) => item.policy_ids ?? []) ?? []),
    ];
  } catch (e) {
    log.warning(`Could not read osquery package policies: ${e}`);

    return readiness;
  }

  if (readiness.osqueryAgentPolicyIds.length === 0) {
    return readiness;
  }

  try {
    const kuery = readiness.osqueryAgentPolicyIds.map((id) => `policy_id:"${id}"`).join(' or ');
    const agents = await kbnClient.request<{ total?: number }>({
      method: 'GET',
      path: `/api/fleet/agents?kuery=${encodeURIComponent(
        `(${kuery}) and status:online`
      )}&perPage=1`,
    });

    readiness.onlineOsqueryAgents = agents.data?.total ?? 0;
  } catch (e) {
    log.warning(`Could not read enrolled Fleet agents: ${e}`);
  }

  return readiness;
}

/**
 * Fails live-query eval setup when the Scout stack cannot actually dispatch a
 * live query. A warning is not enough: otherwise the suite can still pass by
 * scoring degradation text while no Fleet agent could have returned live rows.
 */
export function assertOsqueryLiveQuerySupported(
  readiness: OsqueryLiveQueryReadiness,
  suiteName: string
): void {
  if (readiness.onlineOsqueryAgents > 0) {
    return;
  }

  throw new Error(
    `${suiteName} requires an online Fleet agent enrolled in an Osquery-capable policy ` +
      `before live-query goldens can run (packageInstalled=${readiness.packageInstalled}, ` +
      `osqueryAgentPolicies=${readiness.osqueryAgentPolicyIds.length}, ` +
      `onlineAgents=${readiness.onlineOsqueryAgents}).`
  );
}
