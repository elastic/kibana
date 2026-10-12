/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import type { ListProposalsResponse } from '@kbn/proposals-common';
import { seedEndpointHosts } from '../../../scout/edr_response_actions/common/seed_endpoint_hosts';
import { completeHostAction } from '../../../scout/edr_response_actions/common/complete_host_action';
import {
  apiTest,
  tags,
  testData,
  createServiceAccount,
  deleteServiceAccount,
  getAdminApi,
  getWorker,
  listExecutionIds,
  ok,
  pollUntil,
  resetWorker,
  seedAttackScenario,
  updateWorker,
  assertExecutionCompleted,
  waitForExecution,
  waitForNewExecution,
} from '../fixtures';
import type { SeededScenario } from '../fixtures';

const WORKER_ID = testData.FLOOR_ATTACK_DISCOVERY_WORKER_ID;

interface EndpointAction {
  id: string;
  command: string;
  agents: string[];
  startedAt: string;
}

/**
 * Seeded attack chain -> Attack Discovery -> review -> Investigate proposal -> approve ->
 * forensics -> Isolate proposal -> approve -> Defend isolate action.
 *
 * Every hop is a real workflow run against a real model (EIS, via the `alertzero_e2e` config
 * set); nothing is stubbed. Proposals are read from the queue and approved through the same
 * route the approval modal calls.
 */
apiTest.describe(
  'AlertZero e2e - attack discovery to host isolation',
  { tag: [...tags.stateful.classic] },
  () => {
    let scenario: SeededScenario | undefined;
    let serviceAccountId: string | undefined;
    let cleanupHosts: (() => Promise<void>) | undefined;

    apiTest.afterAll(async ({ apiClient, samlAuth }) => {
      // Every step runs even when an earlier one throws, so one failure cannot leak the seeded
      // host, the service account or the scenario alerts. Failures are reported together.
      const errors: unknown[] = [];
      const attempt = async (step: () => Promise<unknown>) => {
        try {
          await step();
        } catch (error) {
          errors.push(error);
        }
      };
      let api: Awaited<ReturnType<typeof getAdminApi>> | undefined;
      await attempt(async () => {
        api = await getAdminApi(apiClient, samlAuth);
      });
      await attempt(async () => {
        if (api) await resetWorker(api, WORKER_ID);
      });
      await attempt(async () => cleanupHosts?.());
      await attempt(async () => {
        if (api && serviceAccountId) await deleteServiceAccount(api, serviceAccountId);
      });
      await attempt(async () => scenario?.cleanup());
      if (errors.length > 0) {
        throw new Error(
          `AlertZero e2e cleanup failed: ${errors
            .map((error) => (error instanceof Error ? error.message : String(error)))
            .join('; ')}`
        );
      }
    });

    apiTest(
      'turns a seeded attack chain into an approved host isolation',
      async ({ apiClient, samlAuth, esClient, kbnClient, config }) => {
        apiTest.setTimeout(testData.GENERATION_TIMEOUT_MS + 3 * testData.PROPOSAL_TIMEOUT_MS);
        const api = await getAdminApi(apiClient, samlAuth);

        scenario = await seedAttackScenario(esClient, api);
        const hosts = await seedEndpointHosts({
          esClient,
          kbnClient,
          spaceId: 'default',
          config,
          count: 1,
          isolation: false,
        });
        cleanupHosts = hosts.cleanup;

        serviceAccountId = await createServiceAccount(api);
        const worker = await getWorker(api, WORKER_ID);
        const workerWorkflowId = worker.workflowId;
        if (!workerWorkflowId) {
          throw new Error(`Worker ${WORKER_ID} has no workflow installed`);
        }
        await updateWorker(api, WORKER_ID, {
          settingsRevision: worker.settingsRevision ?? null,
          settings: { serviceAccountId },
        });

        // 1. Run Attack Discovery over the seeded window. Enabling the worker makes Task Manager
        // run it at once, as its service account; that scheduled run is the one under test. The
        // shared runner is not started by hand: a hand-started run executes as the caller, so the
        // runner's `run-as-mode: inherit` steps fail with "Service account inheritance requires a
        // parent executing as a service account", and it shares a `cancel-in-progress` concurrency
        // key with the worker's own run, so whichever starts second cancels the other.
        const knownExecutionIds = await listExecutionIds(api, workerWorkflowId);
        const startedAt = new Date().toISOString();
        expect((await updateWorker(api, WORKER_ID, { enabled: true })).enabled).toBe(true);
        const workflowExecutionId = await waitForNewExecution(
          api,
          workerWorkflowId,
          knownExecutionIds,
          { timeoutMs: testData.ACTION_TIMEOUT_MS }
        );
        const execution = await waitForExecution(
          api,
          'the attack discovery worker execution to finish',
          workflowExecutionId,
          { timeoutMs: testData.GENERATION_TIMEOUT_MS }
        );
        await assertExecutionCompleted(api, 'The attack discovery worker execution', execution);

        const findPending = async (actionWorkflowId: string) =>
          ok(
            await api.internal<ListProposalsResponse>('GET', '/internal/proposals', {
              query: { origin: 'alertzero', status: 'pending', size: 100 },
            }),
            'list pending proposals'
          ).proposals.find(
            (proposal) =>
              proposal.actionWorkflowId === actionWorkflowId && proposal.createdAt >= startedAt
          );

        // 2. The review of the discovered attack proposes handing off to forensics.
        const investigate = await pollUntil(
          'an Investigate (handoff to forensics) proposal',
          () => findPending(testData.HANDOFF_TO_FORENSICS_ACTION_ID),
          { timeoutMs: testData.PROPOSAL_TIMEOUT_MS }
        );
        expect(investigate.actionInput).toBeDefined();

        // 3. Approve it exactly as the approval modal does; forensics now runs.
        ok(
          await api.internal('POST', `/internal/proposals/${investigate.id}/approve`, {
            body: { actionInput: investigate.actionInput },
          }),
          'approve the Investigate proposal'
        );

        // 4. Forensics ends in an Isolate proposal for the compromised host.
        const isolate = await pollUntil(
          'an Isolate host proposal',
          () => findPending(testData.ISOLATE_HOST_ACTION_ID),
          { timeoutMs: testData.PROPOSAL_TIMEOUT_MS }
        );
        ok(
          await api.internal('POST', `/internal/proposals/${isolate.id}/approve`, {
            body: { actionInput: isolate.actionInput },
          }),
          'approve the Isolate proposal'
        );

        // 5. The approval creates a Defend isolate action. Complete it as the agent would.
        const action = await pollUntil(
          'the Defend isolate action',
          async () =>
            ok(
              await api.public<{ data: EndpointAction[] }>(
                'GET',
                '/api/endpoint/action?commands=isolate&pageSize=20'
              ),
              'list endpoint actions'
            ).data.find((candidate) => candidate.startedAt >= startedAt),
          { timeoutMs: testData.ACTION_TIMEOUT_MS }
        );
        expect(action.agents.length).toBeGreaterThan(0);
        await completeHostAction({ esClient, config, action: action as never });
      }
    );
  }
);
