/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { addMonitor } from '../../../scout/common/fixtures/monitors';
import {
  getAgentPolicyRevision,
  getFleetAgentPolicyRevision,
  getPackagePolicyForMonitor,
} from '../../../scout/common/fixtures/fleet';
import { delay, tryForTime } from '../../../scout/common/fixtures/retry';
import { agentIdFromCondition } from '../../../../server/synthetics_service/private_location/assign_by_condition';
import { STALE_CHECKIN_MS } from '../../../../server/synthetics_service/private_location/plan_rebalance';
import { buildMonitorPayload } from './monitor_payloads';
import type { AgentStack } from './agent_stack';

export const HTTP_SCHEDULE = { number: '1', unit: 'm' } as const;
export const ASSIGNMENT_TIMEOUT_MS = 90_000;
export const FAILOVER_TIMEOUT_MS = 5 * 60_000;
export const CHECK_TIMEOUT_MS = 3 * 60_000;
/** Two 1m task ticks; stays under RECOVERY_STABILITY_MS / STALE_DATA_MS. */
export const REBALANCE_OBSERVE_MS = 2 * 60_000;

export const assignedAgentId = async (
  apiClient: ApiClientFixture,
  adminHeaders: Record<string, string>,
  monitorId: string,
  locationId: string
): Promise<string | undefined> => {
  const policy = await getPackagePolicyForMonitor(apiClient, adminHeaders, monitorId, locationId);
  return agentIdFromCondition(policy?.condition);
};

export const waitUntilAssigned = async (
  apiClient: ApiClientFixture,
  adminHeaders: Record<string, string>,
  monitorIds: string[],
  enrolledIds: string[],
  locationId: string
): Promise<Map<string, string>> => {
  const assignment = new Map<string, string>();
  await tryForTime(ASSIGNMENT_TIMEOUT_MS, async () => {
    assignment.clear();
    for (const monitorId of monitorIds) {
      const agentId = await assignedAgentId(apiClient, adminHeaders, monitorId, locationId);
      expect(agentId, `monitor ${monitorId} has an assigned agent`).toBeDefined();
      expect(enrolledIds).toContain(agentId);
      assignment.set(monitorId, agentId as string);
    }
  });
  return assignment;
};

export const createHttpMonitors = async (
  apiClient: ApiClientFixture,
  editorHeaders: Record<string, string>,
  agentStack: AgentStack,
  count: number,
  namePrefix: string
): Promise<string[]> => {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const res = await addMonitor(apiClient, editorHeaders, {
      ...buildMonitorPayload('http', agentStack),
      name: `${namePrefix}-${i}-${agentStack.runId}`,
      schedule: HTTP_SCHEDULE,
    });
    const id = (res.body as { id?: unknown }).id;
    expect(typeof id).toBe('string');
    ids.push(id as string);
  }
  return ids;
};

export const pickFailover = (
  assignment: Map<string, string>,
  enrolledIds: string[]
): { killedAgentId: string; survivorAgentId: string; movedMonitorIds: string[] } => {
  const onFirst = [...assignment.entries()].filter(([, id]) => id === enrolledIds[0]);
  const onSecond = [...assignment.entries()].filter(([, id]) => id === enrolledIds[1]);
  expect(onFirst.length + onSecond.length).toBe(assignment.size);
  const [killedAgentId, survivorAgentId, movedMonitorIds] =
    onFirst.length > 0
      ? [enrolledIds[0], enrolledIds[1], onFirst.map(([id]) => id)]
      : [enrolledIds[1], enrolledIds[0], onSecond.map(([id]) => id)];
  expect(
    movedMonitorIds.length,
    'at least one monitor must be on the killed agent'
  ).toBeGreaterThan(0);
  return { killedAgentId, survivorAgentId, movedMonitorIds };
};

export const staleCheckinIso = (): string =>
  new Date(Date.now() - STALE_CHECKIN_MS - 30_000).toISOString();

export const readAssignments = async (
  apiClient: ApiClientFixture,
  adminHeaders: Record<string, string>,
  monitorIds: string[],
  locationId: string
): Promise<Map<string, string | undefined>> => {
  const assignment = new Map<string, string | undefined>();
  for (const monitorId of monitorIds) {
    assignment.set(
      monitorId,
      await assignedAgentId(apiClient, adminHeaders, monitorId, locationId)
    );
  }
  return assignment;
};

export const expectAssignments = (
  actual: Map<string, string | undefined>,
  expected: Map<string, string>
): void => {
  for (const [monitorId, expectedAgentId] of expected) {
    expect(actual.get(monitorId), `monitor ${monitorId} should not be dropped`).toBeDefined();
    expect(actual.get(monitorId), `monitor ${monitorId} assignment`).toBe(expectedAgentId);
  }
};

export const waitForFailoverAndAck = async (
  apiClient: ApiClientFixture,
  adminHeaders: Record<string, string>,
  {
    movedMonitorIds,
    survivorAgentId,
    locationId,
    agentPolicyId,
    revisionBeforeFailover,
    onPoll,
  }: {
    movedMonitorIds: string[];
    survivorAgentId: string;
    locationId: string;
    agentPolicyId: string;
    revisionBeforeFailover: number;
    onPoll?: () => Promise<void>;
  }
): Promise<number> => {
  let deployedRevision = 0;
  await tryForTime(
    FAILOVER_TIMEOUT_MS,
    async () => {
      if (onPoll) {
        await onPoll();
      }
      for (const monitorId of movedMonitorIds) {
        const agentId = await assignedAgentId(apiClient, adminHeaders, monitorId, locationId);
        expect(agentId, `monitor ${monitorId} should not be dropped`).toBeDefined();
        expect(agentId, `monitor ${monitorId} should have moved off the stopped agent`).toBe(
          survivorAgentId
        );
      }
      deployedRevision = await getAgentPolicyRevision(apiClient, adminHeaders, agentPolicyId);
      expect(deployedRevision).toBeGreaterThan(revisionBeforeFailover);
      const appliedRevision = await getFleetAgentPolicyRevision(
        apiClient,
        adminHeaders,
        survivorAgentId
      );
      expect(
        appliedRevision,
        `survivor ${survivorAgentId} should have applied policy revision ${deployedRevision}`
      ).toBeGreaterThanOrEqual(deployedRevision);
    },
    { intervalMs: 10_000 }
  );
  return deployedRevision;
};

export const waitUntilAgentAppliedRevision = async (
  apiClient: ApiClientFixture,
  adminHeaders: Record<string, string>,
  agentId: string,
  minRevision: number,
  timeoutMs = 180_000
): Promise<void> => {
  await tryForTime(
    timeoutMs,
    async () => {
      const applied = await getFleetAgentPolicyRevision(apiClient, adminHeaders, agentId);
      expect(
        applied,
        `agent ${agentId} should have applied policy revision ${minRevision}`
      ).toBeGreaterThanOrEqual(minRevision);
    },
    { intervalMs: 5_000 }
  );
};

/** Polls for `durationMs` and fails on the first assignment drift. */
export const assertAssignmentsHold = async (
  apiClient: ApiClientFixture,
  adminHeaders: Record<string, string>,
  expected: Map<string, string>,
  locationId: string,
  durationMs: number,
  onPoll?: () => Promise<void>
): Promise<void> => {
  const deadline = Date.now() + durationMs;
  while (Date.now() < deadline) {
    if (onPoll) {
      await onPoll();
    }
    expectAssignments(
      await readAssignments(apiClient, adminHeaders, [...expected.keys()], locationId),
      expected
    );
    await delay(10_000);
  }
};
