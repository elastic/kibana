/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more
 * contributor license agreements. Licensed under the Elastic License 2.0; you may not use this
 * file except in compliance with the Elastic License 2.0.
 */

import { randomBytes } from 'crypto';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';

/**
 * Approve-path plumbing for `evals/hunt_watch_approval.spec.ts`.
 *
 * Approving the assume-role report's suspend-process Proposal runs the managed Defend action,
 * which POSTs `/api/endpoint/action/suspend_process` and polls until the endpoint reports
 * completion. On the eval stack WIN-ANALYST01 is a seeded host, not a live endpoint, so three
 * things must hold before the approve test triggers its run:
 *
 * 1. `metrics-endpoint.metadata-default` must carry the host: the route's agent validation
 *    resolves endpoint ids against `metrics-endpoint.metadata_current`, the transform view of
 *    that index. The generator writes neither, so the doc is indexed here and the transforms
 *    waited on.
 * 2. The seeded `.fleet-agents` doc's `policy_id` must resolve to a Fleet agent policy carrying
 *    an `endpoint` package policy, or the Defend client rejects the request with `Data
 *    inconsistency detected`. The seeded id is a placeholder, so a real policy pair is created
 *    (Fleet API) and the agent doc's `policy_id` pointed at it, restored on teardown.
 * 3. Something must answer the dispatched action: the poll waits for `isCompleted`, which flips
 *    only when a response doc naming the action id lands in
 *    `.logs-endpoint.action.responses-default`. The responder watches for outstanding actions
 *    after the approve POST returns and answers each with a success response, the same response
 *    shape `kbn-evals-suite-endpoint` and the endpoint action generator use.
 */

/** WIN-ANALYST01 constants shared with `scripts/data/lib/pack_host_correlation.ts` (aws-iam pack). */
export const HUNT_AGENT_ID = 'a1b2c3d4-5e6f-4a1b-9c2d-3e4f5a6b7c8d';
export const HUNT_HOST_NAME = 'WIN-ANALYST01';
export const SUSPENDED_PROCESS_PID = 4288;

/** Host metadata doc for the hunt host, indexed so endpoint-id validation resolves it. */
export const HUNT_HOST_METADATA_DOC = {
  '@timestamp': new Date().toISOString(),
  event: { kind: 'metric', dataset: 'endpoint.metadata', module: 'endpoint' },
  data_stream: { type: 'metrics', dataset: 'endpoint.metadata', namespace: 'default' },
  agent: { id: HUNT_AGENT_ID, type: 'endpoint', version: '8.15.0' },
  host: {
    name: HUNT_HOST_NAME,
    hostname: HUNT_HOST_NAME,
    os: { name: 'Windows Server 2019 Datacenter', version: '10.0' },
  },
  elastic: { agent: { id: HUNT_AGENT_ID } },
  Endpoint: { status: 'enrolled' },
} as const;

/** Success response for a suspend-process action, the shape the action-details read expects. */
export const buildSuspendProcessResponseDoc = (actionId: string) => ({
  '@timestamp': new Date().toISOString(),
  agent: { id: HUNT_AGENT_ID },
  EndpointActions: {
    action_id: actionId,
    completed_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    data: {
      command: 'suspend-process',
      comment: '',
      output: {
        type: 'json',
        content: {
          code: 'ra_suspend-process_success_done',
          command: 'aws.exe',
          pid: SUSPENDED_PROCESS_PID,
        },
      },
    },
  },
});

/**
 * `.fleet-agents` is a restricted index even the superuser cannot write directly, so writes go
 * through a short-lived role/user with `allow_restricted_indices` scoped to it — the same
 * workaround `scripts/data/lib/pack_host_correlation.ts` uses for its own agent seed.
 */
interface SystemIndicesSession {
  auth: { headers: { authorization: string } };
  roleName: string;
  username: string;
}

const FLEET_AGENTS_INDEX = '.fleet-agents';

const acquireSystemIndicesAuth = async (
  esClient: Client,
  log: ToolingLog
): Promise<SystemIndicesSession> => {
  const suffix = randomBytes(8).toString('hex');
  const roleName = `hunt-eval-system-indices-${suffix}`;
  const username = `hunt-eval-system-indices-${suffix}`;
  const password = `he-${randomBytes(24).toString('hex')}`;
  await esClient.security.putRole({
    name: roleName,
    indices: [{ names: [FLEET_AGENTS_INDEX], privileges: ['all'], allow_restricted_indices: true }],
  });
  try {
    await esClient.security.putUser({ username, password, roles: [roleName] });
  } catch (error) {
    await esClient.security
      .deleteRole({ name: roleName }, { ignore: [404] })
      .catch(() => undefined);
    throw error;
  }
  return {
    roleName,
    username,
    auth: {
      headers: {
        authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      },
    },
  };
};

const releaseSystemIndicesUser = async (
  esClient: Client,
  log: ToolingLog,
  session: Pick<SystemIndicesSession, 'roleName' | 'username'>
): Promise<void> => {
  try {
    await esClient.security.deleteUser({ username: session.username }, { ignore: [404] });
    await esClient.security.deleteRole({ name: session.roleName }, { ignore: [404] });
  } catch (error) {
    log.warning(`hunt approve path: temp system-indices user cleanup failed: ${String(error)}`);
  }
};

/**
 * Indexes the hunt host's endpoint metadata and waits for the metadata transforms to propagate
 * it into `metrics-endpoint.metadata_current` / `metadata_united`, which is where endpoint-id
 * validation resolves the agent.
 */
export const ensureHuntEndpointMetadata = async ({
  esClient,
  log,
  maxWaitMs = 180_000,
}: {
  esClient: Client;
  log: ToolingLog;
  maxWaitMs?: number;
}): Promise<void> => {
  await esClient.create({
    index: 'metrics-endpoint.metadata-default',
    id: `hunt-eval-win-analyst01-${Date.now()}`,
    refresh: true,
    document: HUNT_HOST_METADATA_DOC,
  });
  log.info(`approve path: indexed endpoint metadata for ${HUNT_HOST_NAME}; awaiting transforms`);

  // The metadata_current / metadata_united views are transform outputs. Restart any stopped
  // transform before waiting, the way the endpoint suite's `waitForEndpointPackage` does.
  try {
    const stats = await esClient.transform.getTransformStats({ transform_id: 'endpoint*' });
    for (const stat of stats.transforms.filter((s) => s.state === 'stopped')) {
      try {
        await esClient.transform.startTransform({ transform_id: stat.id });
      } catch {
        // already started elsewhere; the wait below still guards
      }
    }
  } catch {
    // transforms not installed (endpoint package missing): the wait below fails loud instead
  }

  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const [current, united] = await Promise.all([
      esClient
        .count({
          index: 'metrics-endpoint.metadata_current_*',
          query: { term: { 'agent.id': HUNT_AGENT_ID } },
          ignore_unavailable: true,
        })
        .catch(() => ({ count: 0 })),
      esClient
        .count({
          index: '.metrics-endpoint.metadata_united_default',
          query: { term: { 'agent.id': HUNT_AGENT_ID } },
          ignore_unavailable: true,
        })
        .catch(() => ({ count: 0 })),
    ]);
    if (current.count >= 1 && united.count >= 1) {
      log.info('approve path: endpoint metadata propagated to metadata_current/united');
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error(
    `approve path: hunt host metadata did not reach metrics-endpoint.metadata_current / ` +
      `metadata_united within ${maxWaitMs}ms; endpoint-id validation would reject the agent`
  );
};

/**
 * Points the seeded `.fleet-agents` doc's `policy_id` at `policyId` and returns the previous
 * value, so teardown can restore it. Returns undefined when the agent doc is absent.
 */
export const retargetFleetAgentPolicyId = async ({
  esClient,
  policyId,
  log,
}: {
  esClient: Client;
  policyId: string;
  log: ToolingLog;
}): Promise<string | undefined> => {
  const session = await acquireSystemIndicesAuth(esClient, log);
  try {
    const { _source } = await esClient.get<{ policy_id?: string }>(
      { index: FLEET_AGENTS_INDEX, id: HUNT_AGENT_ID },
      session.auth
    );
    const previous = _source?.policy_id;
    await esClient.update(
      {
        index: FLEET_AGENTS_INDEX,
        id: HUNT_AGENT_ID,
        refresh: true,
        doc: { policy_id: policyId },
      },
      session.auth
    );
    return previous;
  } finally {
    await releaseSystemIndicesUser(esClient, log, session);
  }
};

export const buildDispatchedActionsQuery = (since: string) => ({
  bool: {
    filter: [{ term: { 'agent.id': HUNT_AGENT_ID } }, { range: { '@timestamp': { gte: since } } }],
  },
});

/**
 * Lists action ids dispatched to the hunt agent at or after `since` that have no response doc
 * yet. Bounded by time and sorted newest first, because a reused stack accumulates this agent's
 * actions across runs and an unsorted page could miss the one just dispatched.
 */
export const listUnansweredActionIds = async ({
  esClient,
  since,
}: {
  esClient: Client;
  since: string;
}): Promise<string[]> => {
  const { hits } = await esClient.search<{ EndpointActions?: { action_id?: string } }>({
    index: '.logs-endpoint.actions-default',
    query: buildDispatchedActionsQuery(since),
    sort: [{ '@timestamp': { order: 'desc' } }],
    size: 50,
    ignore_unavailable: true,
  });
  const dispatched = hits.hits
    .map((hit) => hit._source?.EndpointActions?.action_id)
    .filter((id): id is string => typeof id === 'string');
  if (dispatched.length === 0) return [];
  const { hits: answered } = await esClient.search<{ EndpointActions?: { action_id?: string } }>({
    index: '.logs-endpoint.action.responses-default',
    query: { terms: { 'EndpointActions.action_id': dispatched } },
    size: 100,
    ignore_unavailable: true,
  });
  const done = new Set(
    answered.hits
      .map((hit) => hit._source?.EndpointActions?.action_id)
      .filter((id): id is string => typeof id === 'string')
  );
  return dispatched.filter((id) => !done.has(id));
};

/**
 * Answers every outstanding suspend-process action for the hunt agent with a success response
 * doc, so the approve path's `isCompleted` poll resolves instead of timing out. Called between
 * the approve POST and the close wait: the action id only exists after the workflow dispatches,
 * which happens after the approve call returns. `since` is taken before the approve POST, so only
 * actions this test dispatched are answered.
 */
export const respondToOutstandingActions = async ({
  esClient,
  log,
  since,
  maxWaitMs = 150_000,
}: {
  esClient: Client;
  log: ToolingLog;
  since: string;
  maxWaitMs?: number;
}): Promise<number> => {
  const deadline = Date.now() + maxWaitMs;
  let answered = 0;
  // Return only after every dispatched action is answered and a quiet period has passed with
  // nothing new outstanding, so a second dispatch that lands a few seconds after the first is
  // answered too rather than left to time out the workflow's poll.
  let quietChecks = 0;
  while (Date.now() < deadline) {
    const outstanding = await listUnansweredActionIds({ esClient, since });
    if (outstanding.length === 0) {
      if (answered > 0 && quietChecks >= 2) return answered;
      quietChecks += 1;
    } else {
      quietChecks = 0;
      for (const actionId of outstanding) {
        // Data stream: only create ops may carry an id.
        await esClient.create({
          index: '.logs-endpoint.action.responses-default',
          id: `hunt-eval-response-${actionId}`,
          refresh: true,
          document: buildSuspendProcessResponseDoc(actionId),
        });
        answered += 1;
        log.info(`approve path: answered endpoint action ${actionId}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  return answered;
};
