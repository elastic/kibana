/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HuntForThreatResponse,
  HuntIndexScopeResponse,
  HuntWorkerIndexCoverageResponse,
} from '@kbn/alertzero-common';
import { ALERTZERO_WORKERS_URL, HUNT_INDEX_SCOPE_URL } from '@kbn/alertzero-common';
import { expect } from '@kbn/scout-security/api';
import type { ApiClientFixture, ApiServicesFixture, EsClient, SamlAuth } from '@kbn/scout-security';
import {
  readSupplyStatus,
  runCleanupSteps,
  setDefaultIndexInSpace,
  setHuntEnabled,
  setSupplyWorkflowEnabled,
  setupHuntPrerequisites,
  spaceUrl,
  waitForFinishedSweepGate,
  withHuntHeaders,
} from './helpers';
import type { FinishedSweepGate, HuntPrerequisites } from './helpers';
import { HUNT_FOR_THREAT_URL } from './constants';
import type { SupplyWorkflowKey } from './supply_workflow_ids';

const DEPLOYMENT_SUPPLY_KEYS: readonly SupplyWorkflowKey[] = ['ingest', 'enrich'];
const HUNT_WORKER_ID_FRAGMENT = 'hunt-continuous-threat-hunt';

interface WorkerRow {
  id: string;
  workflowId: string | null;
  state: string;
  stateReason?: string;
}

const document = () => ({ '@timestamp': new Date().toISOString(), message: 'scout' });
/** The IOC the standalone hunt searches for, seeded in the readable stream so it can hit. */
const HUNT_IOC_IP = '203.0.113.7';
const sorted = (values: unknown): string[] =>
  Array.isArray(values) ? [...(values as string[])].sort() : [];

interface BlockNames {
  space: string;
  logsPattern: string;
  logsStream: string;
  customIndex: string;
  customAlias: string;
  absent: string;
  /** Exists and is closed: it resolves by name, and nobody can search it. */
  closedIndex: string;
  hiddenIndex: string;
  hiddenAlias: string;
}

export const namesFor = (suffix: string, run: number): BlockNames => ({
  space: `hunt-scope-${suffix}-${run}`,
  logsPattern: `logs-huntscope.${suffix}${run}-*`,
  logsStream: `logs-huntscope.${suffix}${run}-default`,
  customIndex: `custom-edr-c-${suffix}${run}-1`,
  customAlias: `custom-edr-alias-${suffix}${run}`,
  absent: `custom-edr-absent-${suffix}${run}`,
  closedIndex: `custom-edr-closed-${suffix}${run}`,
  hiddenIndex: `.siem-signals-scout-${suffix}${run}-000001`,
  hiddenAlias: `.siem-signals-scout-${suffix}${run}`,
});

const readHuntWorker = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  spaceId: string
): Promise<WorkerRow | undefined> => {
  const listed = await apiClient.get(spaceUrl(ALERTZERO_WORKERS_URL, spaceId), {
    headers,
    responseType: 'json',
  });
  return (listed.body as { workers: WorkerRow[] }).workers.find(({ id }) =>
    id.includes(HUNT_WORKER_ID_FRAGMENT)
  );
};

interface SetupFixtures {
  apiServices: ApiServicesFixture;
  samlAuth: SamlAuth;
  apiClient: ApiClientFixture;
  esClient: EsClient;
}

export interface BlockState {
  headers: Record<string, string>;
  prerequisites: HuntPrerequisites;
  initialSupply: Partial<Record<SupplyWorkflowKey, boolean>>;
}

/** Per-block setup: space, one index per kind of name, prerequisites, and the data view. */
export const setupBlock = async ({
  fixtures: { apiServices, samlAuth, apiClient, esClient },
  names,
  withLogsStream,
  patterns,
}: {
  fixtures: SetupFixtures;
  names: BlockNames;
  withLogsStream: boolean;
  patterns: string[];
}): Promise<BlockState> => {
  await apiServices.spaces.create({ id: names.space, name: names.space });
  await apiServices.spaces.setSolutionView({ id: names.space, solution: 'security' });
  const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
  const headers = withHuntHeaders(cookieHeader);
  if (withLogsStream) {
    // A fresh Scout cluster has no `logs-*` data stream; the name matches the `logs-*-*` template.
    await esClient.index({
      index: names.logsStream,
      document: { ...document(), source: { ip: HUNT_IOC_IP } },
      refresh: true,
    });
  }
  await esClient.index({ index: names.customIndex, document: document(), refresh: true });
  if (withLogsStream) {
    await esClient.indices.putAlias({ index: names.customIndex, name: names.customAlias });
    await esClient.index({ index: names.closedIndex, document: document(), refresh: true });
    await esClient.indices.close({ index: names.closedIndex });
  }
  await esClient.indices.create({
    index: names.hiddenIndex,
    settings: { hidden: true },
    aliases: { [names.hiddenAlias]: {} },
  });
  const prerequisites = await setupHuntPrerequisites({
    apiClient,
    headers,
    spaceId: names.space,
  });
  try {
    // Enabling Hunt turns the deployment-wide ingest and enrich workflows on; record them first.
    const baseline = await readSupplyStatus(apiClient, headers, names.space);
    expect(baseline.statusCode).toBe(200);
    const initialSupply: Partial<Record<SupplyWorkflowKey, boolean>> = {};
    for (const key of DEPLOYMENT_SUPPLY_KEYS) {
      initialSupply[key] = baseline.body.workflows.find((row) => row.key === key)?.enabled;
    }
    await setDefaultIndexInSpace({ apiClient, headers, spaceId: names.space, patterns });
    return { headers, prerequisites, initialSupply };
  } catch (error) {
    // No state is returned on this path, so teardown cannot reach the prerequisites.
    await prerequisites.cleanup().catch(() => undefined);
    throw error;
  }
};

export const teardownBlock = async ({
  fixtures: { apiServices, apiClient, esClient },
  names,
  withLogsStream,
  state,
}: {
  fixtures: Omit<SetupFixtures, 'samlAuth'>;
  names: BlockNames;
  withLogsStream: boolean;
  /** Undefined when `setupBlock` threw: the indices and the space are still removed. */
  state: BlockState | undefined;
}): Promise<void> => {
  const stateSteps = state
    ? [
        {
          name: 'disable the hunt worker',
          run: async () => {
            const { statusCode } = await setHuntEnabled({
              apiClient,
              headers: state.headers,
              spaceId: names.space,
              enabled: false,
            });
            if (statusCode !== 200) {
              throw new Error(`disabling the hunt worker answered ${statusCode}`);
            }
          },
        },
        {
          name: 'restore deployment supply rows',
          run: async () => {
            const after = await readSupplyStatus(apiClient, state.headers, names.space);
            if (after.statusCode !== 200) {
              throw new Error(`reading the supply rows answered ${after.statusCode}`);
            }
            const failures: string[] = [];
            for (const key of DEPLOYMENT_SUPPLY_KEYS) {
              const initial = state.initialSupply[key];
              const current = after.body.workflows.find((row) => row.key === key);
              if (initial !== undefined && current?.installed && current.enabled !== initial) {
                const { statusCode } = await setSupplyWorkflowEnabled({
                  apiClient,
                  headers: state.headers,
                  key,
                  enabled: initial,
                });
                if (statusCode !== 200) failures.push(`${key} answered ${statusCode}`);
              }
            }
            if (failures.length > 0) {
              throw new Error(`restoring the supply rows failed: ${failures.join(', ')}`);
            }
          },
        },
        { name: 'clean up prerequisites', run: async () => state.prerequisites.cleanup() },
      ]
    : [];
  await runCleanupSteps([
    ...stateSteps,
    {
      name: 'delete the logs data stream',
      run: async () => {
        if (withLogsStream) {
          await esClient.indices.deleteDataStream({ name: names.logsStream }, { ignore: [404] });
        }
      },
    },
    {
      name: 'delete the custom index',
      run: () => esClient.indices.delete({ index: names.customIndex, ignore_unavailable: true }),
    },
    {
      name: 'delete the closed index',
      run: () => esClient.indices.delete({ index: names.closedIndex, ignore_unavailable: true }),
    },
    {
      name: 'delete the hidden index',
      run: () => esClient.indices.delete({ index: names.hiddenIndex, ignore_unavailable: true }),
    },
    { name: `delete space ${names.space}`, run: () => apiServices.spaces.delete(names.space) },
  ]);
};

/** Enables the worker and returns the finished sweep's gate and the worker's state after it. */
export const sweepUntilGate = async ({
  apiClient,
  names,
  state,
  budgetMs,
}: {
  apiClient: ApiClientFixture;
  names: BlockNames;
  state: BlockState;
  budgetMs?: number;
}): Promise<{ gate: FinishedSweepGate | undefined; workerState: WorkerRow | undefined }> => {
  const enabled = await setHuntEnabled({
    apiClient,
    headers: state.headers,
    spaceId: names.space,
    enabled: true,
    serviceAccountId: state.prerequisites.serviceAccountId,
  });
  expect(enabled.statusCode).toBe(200);
  const workflowId = (await readHuntWorker(apiClient, state.headers, names.space))?.workflowId;
  expect(typeof workflowId).toBe('string');
  const gate = await waitForFinishedSweepGate({
    apiClient,
    headers: state.headers,
    spaceId: names.space,
    workflowId: workflowId as string,
    ...(budgetMs ? { budgetMs } : {}),
  });
  const workerState = await readHuntWorker(apiClient, state.headers, names.space);
  return { gate, workerState };
};

export const SWEEP_TEST_TIMEOUT_MS = 240_000;
export const FAN_OUT_BUDGET_MS = 180_000;

interface VerifyContext {
  names: BlockNames;
  gate: FinishedSweepGate | undefined;
  apiClient: ApiClientFixture;
  headers: Record<string, string>;
  workerState: WorkerRow | undefined;
  coverage: HuntWorkerIndexCoverageResponse;
}
const compare = (mismatches: string[], label: string, actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    mismatches.push(
      `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
};

/** What a caller who can read everything sees: the scope route, and the standalone IOC Hunt. */
const verifyHumanCaller = async ({
  names,
  apiClient,
  headers,
  mismatches,
}: Pick<VerifyContext, 'names' | 'apiClient' | 'headers'> & {
  mismatches: string[];
}): Promise<void> => {
  const humanResponse = await apiClient.get(spaceUrl(HUNT_INDEX_SCOPE_URL, names.space), {
    headers,
    responseType: 'json',
  });
  compare(mismatches, 'caller index_scope status code', humanResponse.statusCode, 200);
  const humanScope = (humanResponse.body ?? {}) as Partial<HuntIndexScopeResponse>;
  const humanPatterns = humanScope.index_patterns ?? [];
  compare(mismatches, 'caller policy_skipped', humanScope.policy_skipped, [names.hiddenAlias]);
  compare(mismatches, 'caller missing', humanScope.missing, [names.absent, names.closedIndex]);
  if (
    humanPatterns.includes(names.absent) ||
    humanPatterns.includes(names.closedIndex) ||
    humanPatterns.includes(names.hiddenAlias)
  ) {
    mismatches.push(
      `caller index_patterns still names a dropped or hidden entry: ${JSON.stringify(
        humanPatterns
      )}`
    );
  }
  const hunt = await apiClient.post(spaceUrl(HUNT_FOR_THREAT_URL, names.space), {
    headers,
    responseType: 'json',
    body: {
      iocs: [{ type: 'ip', value: HUNT_IOC_IP }],
      time_range: { from: 'now-1h', to: 'now' },
    },
  });
  compare(mismatches, 'hunt_for_threat status code', hunt.statusCode, 200);
  compare(
    mismatches,
    'hunt_for_threat policy_skipped',
    (hunt.body as HuntForThreatResponse).scope?.policy_skipped,
    [names.hiddenAlias]
  );
  const hits = (hunt.body as HuntForThreatResponse).result;
  if (
    hits?.status !== 'environment_hits_found' ||
    !hits.per_index.some(({ index }) => index.includes(names.logsStream))
  ) {
    mismatches.push(
      `hunt_for_threat did not find the seeded IOC in ${names.logsStream}: status ${hits?.status}`
    );
  }
  const scopeGap = (hunt.body as HuntForThreatResponse).result?.incomplete?.find(
    ({ reason }) => reason === 'index_not_searched'
  );
  const unreported = [names.absent, names.closedIndex].filter(
    (name) => !scopeGap?.detail.includes(`\`${name}\``)
  );
  if (unreported.length > 0) {
    mismatches.push(
      `hunt_for_threat did not report ${unreported.join(
        ', '
      )} as index_not_searched: ${JSON.stringify(scopeGap)}`
    );
  }
};

export const verifyPartial = async ({
  names,
  gate,
  apiClient,
  headers,
  workerState,
  coverage,
}: VerifyContext): Promise<string[]> => {
  const mismatches: string[] = [];
  const scopeOutput = (gate?.output ?? {}) as Partial<HuntIndexScopeResponse>;
  const custom = [names.customIndex, names.customAlias, names.absent, names.closedIndex];

  // 1. gate output
  compare(mismatches, 'gate status', scopeOutput.status, 'ok');
  compare(mismatches, 'gate resolution', scopeOutput.resolution, 'universe');
  compare(mismatches, 'gate index_patterns', scopeOutput.index_patterns, [names.logsPattern]);
  compare(mismatches, 'gate missing', sorted(scopeOutput.missing), [...custom].sort());
  compare(mismatches, 'gate policy_skipped', scopeOutput.policy_skipped, [names.hiddenAlias]);

  // 2. the gate step let the sweep through
  const blocked = (gate?.resolveGate?.output as { index_scope_blocked?: unknown } | undefined)
    ?.index_scope_blocked;
  compare(mismatches, 'index_scope_blocked', String(blocked), 'false');

  // 3. candidate selection ran as the service account
  const select = gate?.selectCandidates;
  if (select?.status !== 'completed' || select.output === undefined) {
    mismatches.push(
      `select_candidate_reports did not complete: status ${select?.status}, error ${JSON.stringify(
        select?.error
      )}`
    );
  }

  // 4. coverage from the last sweep
  compare(mismatches, 'coverage source', coverage.source, 'last_sweep');
  compare(
    mismatches,
    'coverage unreadable_by_worker',
    sorted(coverage.unreadable_by_worker),
    [names.customIndex, names.customAlias].sort()
  );
  compare(mismatches, 'coverage missing_for_everyone', coverage.missing_for_everyone, [
    names.absent,
    names.closedIndex,
  ]);
  compare(mismatches, 'coverage policy_skipped', coverage.policy_skipped, [names.hiddenAlias]);

  // 5. the worker is healthy
  compare(mismatches, 'worker state', workerState?.state, 'ok');
  compare(mismatches, 'worker stateReason', workerState?.stateReason, undefined);

  // 6. a human caller
  await verifyHumanCaller({ names, apiClient, headers, mismatches });
  return mismatches;
};

export const verifyBlocked = async ({
  names,
  gate,
  workerState,
  coverage,
}: VerifyContext): Promise<string[]> => {
  const mismatches: string[] = [];
  const scopeOutput = (gate?.output ?? {}) as Partial<HuntIndexScopeResponse>;

  compare(mismatches, 'gate status', scopeOutput.status, 'blocked');
  compare(mismatches, 'gate resolution', scopeOutput.resolution, 'blocked:empty_universe');
  compare(mismatches, 'gate index_patterns', scopeOutput.index_patterns, []);
  compare(mismatches, 'gate missing', scopeOutput.missing, [names.customIndex]);
  compare(mismatches, 'gate policy_skipped', scopeOutput.policy_skipped, [names.hiddenAlias]);

  const blocked = (gate?.resolveGate?.output as { index_scope_blocked?: unknown } | undefined)
    ?.index_scope_blocked;
  compare(mismatches, 'index_scope_blocked', String(blocked), 'true');
  const select = gate?.selectCandidates;
  // A step skipped by its `if:` is absent or reported skipped. Anything else ran, and a failed
  // request runs on with no output, so the output alone cannot show it did not run.
  if (select && !select.status.toLowerCase().includes('skipped')) {
    mismatches.push(
      `select_candidate_reports ran: status ${select.status}, error ${JSON.stringify(
        select.error
      )}, output ${JSON.stringify(select.output)}`
    );
  }

  compare(mismatches, 'coverage source', coverage.source, 'last_sweep');
  compare(mismatches, 'coverage unreadable_by_worker', coverage.unreadable_by_worker, [
    names.customIndex,
  ]);
  compare(mismatches, 'coverage missing_for_everyone', coverage.missing_for_everyone, []);
  compare(mismatches, 'coverage policy_skipped', coverage.policy_skipped, [names.hiddenAlias]);
  compare(mismatches, 'worker state', workerState?.state, 'degraded');
  const sawNothing = "could not see any index in this space's default data view";
  if (!workerState?.stateReason?.includes(sawNothing)) {
    mismatches.push(
      `worker stateReason does not say the sweep saw nothing: ${JSON.stringify(
        workerState?.stateReason
      )}`
    );
  }
  return mismatches;
};
