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
  ok,
  patchWorker,
  pollUntil,
  seedAttackScenario,
  updateWorker,
} from '../fixtures';
import type { SeededScenario } from '../fixtures';

const WORKER_ID = testData.FLOOR_ATTACK_DISCOVERY_WORKER_ID;
const TERMINAL_EXECUTION_STATUSES = ['completed', 'failed', 'cancelled', 'timed_out'];

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
      const api = await getAdminApi(apiClient, samlAuth);
      await patchWorker(api, WORKER_ID, { enabled: false });
      await cleanupHosts?.();
      if (serviceAccountId) {
        await deleteServiceAccount(api, serviceAccountId);
      }
      await scenario?.cleanup();
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
        await updateWorker(api, WORKER_ID, {
          settingsRevision: worker.settingsRevision ?? null,
          settings: { serviceAccountId },
        });
        expect((await updateWorker(api, WORKER_ID, { enabled: true })).enabled).toBe(true);

        // 1. Run Attack Discovery over the seeded window.
        const startedAt = new Date().toISOString();
        const { workflowExecutionId } = ok(
          await api.public<{ workflowExecutionId: string }>(
            'POST',
            `/api/workflows/workflow/${testData.ATTACK_DISCOVERY_WORKER_WORKFLOW_ID}/run`,
            { body: { inputs: {} } }
          ),
          'run the attack discovery worker'
        );
        const execution = await pollUntil(
          'the attack discovery worker execution to finish',
          async () => {
            const current = ok(
              await api.public<{ status: string }>(
                'GET',
                `/api/workflows/executions/${workflowExecutionId}`
              ),
              'read the worker execution'
            );
            return TERMINAL_EXECUTION_STATUSES.includes(current.status) ? current : undefined;
          },
          { timeoutMs: testData.GENERATION_TIMEOUT_MS }
        );
        expect(execution.status).toBe('completed');

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
