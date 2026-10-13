/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import type { ListProposalsResponse } from '@kbn/proposals-common';
import { getAd2Scenario } from '@kbn/evals-suite-attack-discovery-agent-builder';
import { seedEndpointHosts } from '../../../../scout/edr_response_actions/common/seed_endpoint_hosts';
import {
  completeHostAction,
  deleteSubmittedHostActions,
} from '../../../../scout/edr_response_actions/common/complete_host_action';
import {
  assertExecutionCompleted,
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
  listChatCompletionConnectors,
  waitForExecution,
  waitForExecutionStatus,
  waitForNewExecution,
} from '../fixtures';
import type { SeededScenario } from '../fixtures';

const WORKER_ID = testData.FLOOR_ATTACK_DISCOVERY_WORKER_ID;
const FORENSICS_WORKER_ID = testData.FORENSICS_ENDPOINT_ANALYSIS_WORKER_ID;

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
 * Every hop is a real workflow run against a real model (via the preconfigured inference
 * connectors of the `alertzero` server config set); nothing is stubbed. When the stack was
 * booted without a chat-completion inference connector (plain CI), the flow cannot run and the
 * test skips with an explicit reason instead of failing or silently passing.
 */
apiTest.describe(
  'AlertZero e2e - attack discovery to host isolation',
  { tag: [...tags.stateful.classic] },
  () => {
    let scenario: SeededScenario | undefined;
    let serviceAccountId: string | undefined;
    let cleanupHosts: (() => Promise<void>) | undefined;
    // Isolate actions submitted during the test; `cleanupHosts` only knows the seed-time ids.
    const submittedActionIds: string[] = [];

    apiTest.afterAll(async ({ apiClient, samlAuth, esClient, config }) => {
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
      await attempt(async () => {
        if (api) await resetWorker(api, FORENSICS_WORKER_ID);
      });
      await attempt(async () =>
        deleteSubmittedHostActions({ esClient, config, actionIds: submittedActionIds })
      );
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

        // Guard: this flow is LLM-dependent end to end. When the stack was booted without a
        // chat-completion inference connector (the `alertzero` config set only wires connectors
        // when a connector source exists, which plain CI does not have), every workflow run
        // would fail on its first model call. Skip with an explicit reason instead of failing;
        // with a connector present the flow runs for real (see the config set's doc block).
        const chatConnectors = await listChatCompletionConnectors(api);
        apiTest.skip(
          chatConnectors.length === 0,
          'no preconfigured chat-completion inference connector on this stack; the LLM-dependent AlertZero attack-discovery flow requires one (agent_builder_smoke-style EIS connector source)'
        );

        // Explicit setup: force the per-space anonymization fields install before the workflows
        // run. On a cold space the first `anonymization_fields` read lazily installs it
        // mid-run, which stalls the first model call long enough to time the run out; doing it
        // up front keeps that cost out of the measured path. The lazy install racing real
        // traffic may itself be a product bug — noted, not fixed here.
        ok(
          await api.public('GET', '/api/security_ai_assistant/anonymization_fields/_find'),
          'warm up the anonymization fields install'
        );

        // Seed the enrolled endpoint host first: its real agent id is stamped onto the scenario
        // alerts below. The seed plan otherwise mints a synthetic agent id no Defend agent ever
        // enrolled under, so the isolate action would end in HOST_NOT_ENROLLED.
        const hosts = await seedEndpointHosts({
          esClient,
          kbnClient,
          spaceId: 'default',
          config,
          count: 1,
          isolation: false,
        });
        cleanupHosts = hosts.cleanup;

        const scenarioHost = getAd2Scenario(testData.ATTACK_SCENARIO_KEY, 'clean')?.host;
        if (!scenarioHost) {
          throw new Error(`Unknown attack scenario ${testData.ATTACK_SCENARIO_KEY}`);
        }
        scenario = await seedAttackScenario(esClient, api, {
          agentIdByHost: { [scenarioHost]: hosts.hosts[0].agentId },
        });

        serviceAccountId = await createServiceAccount(api);
        // Save settings BEFORE reading the workflow id: the settings write is what installs the
        // worker's managed workflow, so on a space where the worker has never been configured the
        // read below would otherwise race an install that this spec itself has not triggered yet.
        const beforeSave = await getWorker(api, WORKER_ID);
        await updateWorker(api, WORKER_ID, {
          settingsRevision: beforeSave.settingsRevision ?? null,
          settings: { serviceAccountId },
        });
        // The install is confirmed by the settings write, but it surfaces through the SML indexer
        // asynchronously, so the catalog read can still lag it. Poll (bounded) for a workflow
        // carrying record instead of failing on that race.
        const worker = await pollUntil(
          `worker ${WORKER_ID} to have a workflow installed`,
          async () => {
            const candidate = await getWorker(api, WORKER_ID);
            return candidate.workflowId ? candidate : undefined;
          },
          { timeoutMs: testData.PROPOSAL_TIMEOUT_MS }
        );
        const workerWorkflowId = worker.workflowId;
        if (!workerWorkflowId) {
          throw new Error(`Worker ${WORKER_ID} has no workflow installed`);
        }

        // The forensics Worker stays disabled by default. Enable it under the same service
        // account, or the handoff-to-forensics approval cannot start its workflow and no
        // Isolate proposal can ever exist. Settings first, then enable, mirroring the AD worker.
        const forensicsBeforeSave = await getWorker(api, FORENSICS_WORKER_ID);
        await updateWorker(api, FORENSICS_WORKER_ID, {
          settingsRevision: forensicsBeforeSave.settingsRevision ?? null,
          settings: { serviceAccountId },
        });
        await pollUntil(
          `worker ${FORENSICS_WORKER_ID} to have a workflow installed`,
          async () => {
            const candidate = await getWorker(api, FORENSICS_WORKER_ID);
            return candidate.workflowId ? candidate : undefined;
          },
          { timeoutMs: testData.PROPOSAL_TIMEOUT_MS }
        );
        expect((await updateWorker(api, FORENSICS_WORKER_ID, { enabled: true })).enabled).toBe(
          true
        );

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

        // Correlates a proposal with THIS run's seeded attack: the proposal that drives the
        // isolate must reference the seeded host (agent id or host name) or one of this run's
        // alert ids, otherwise an unrelated AlertZero run could satisfy the test.
        const expectProposalReferencesSeededRun = (
          label: string,
          proposal: { actionInput?: unknown }
        ) => {
          const encoded = JSON.stringify(proposal.actionInput ?? {});
          const referencesSeededRun =
            encoded.includes(hosts.hosts[0].agentId) ||
            encoded.includes(scenarioHost) ||
            (scenario?.alertIds ?? []).some((alertId) => encoded.includes(alertId));
          expect(
            referencesSeededRun,
            `${label} proposal must reference the seeded attack run; actionInput: ${encoded}`
          ).toBe(true);
        };

        // 2. The review of the discovered attack proposes handing off to forensics.
        const investigate = await pollUntil(
          'an Investigate (handoff to forensics) proposal',
          () => findPending(testData.HANDOFF_TO_FORENSICS_ACTION_ID),
          { timeoutMs: testData.PROPOSAL_TIMEOUT_MS }
        );
        expect(investigate.actionInput).toBeDefined();
        expectProposalReferencesSeededRun('Investigate', investigate);

        // Approve exactly as the approval modal does — but only once the execution backing the
        // proposal has parked in `waiting_for_input`. Approving earlier answers 409; retrying
        // the 409 blindly would green the test without the run actually waiting for the human.
        const approveProposal = async (
          label: string,
          proposal: { id: string; actionInput?: unknown; workflowExecutionId?: string }
        ) => {
          if (proposal.workflowExecutionId) {
            // Resolves only once the status equals `waiting_for_input`; a timeout names the
            // execution's last known state, so the assert is the poll itself.
            await waitForExecutionStatus(
              api,
              `the ${label} proposal execution to wait for input`,
              proposal.workflowExecutionId,
              'waiting_for_input',
              { timeoutMs: testData.PROPOSAL_TIMEOUT_MS }
            );
          }
          ok(
            await api.internal('POST', `/internal/proposals/${proposal.id}/approve`, {
              body: { actionInput: proposal.actionInput },
            }),
            `approve the ${label} proposal`
          );
        };

        // 3. Approve it exactly as the approval modal does; forensics now runs.
        await approveProposal('Investigate', investigate);

        // 4. Forensics ends in an Isolate proposal for the compromised host.
        const isolate = await pollUntil(
          'an Isolate host proposal',
          () => findPending(testData.ISOLATE_HOST_ACTION_ID),
          { timeoutMs: testData.PROPOSAL_TIMEOUT_MS }
        );
        expectProposalReferencesSeededRun('Isolate', isolate);
        await approveProposal('Isolate', isolate);

        // 5. The approval creates a Defend isolate action. Complete it as the agent would.
        // The lookup requires the action to target THIS run's seeded host: its agent id is
        // minted by seedEndpointHosts for this spec alone, so an isolate action from an
        // unrelated AlertZero run can no longer satisfy the test.
        const seededAgentId = hosts.hosts[0].agentId;
        const action = await pollUntil(
          'the Defend isolate action',
          async () =>
            ok(
              await api.public<{ data: EndpointAction[] }>(
                'GET',
                '/api/endpoint/action?commands=isolate&pageSize=20'
              ),
              'list endpoint actions'
            ).data.find(
              (candidate) =>
                candidate.startedAt >= startedAt && candidate.agents.includes(seededAgentId)
            ),
          { timeoutMs: testData.ACTION_TIMEOUT_MS }
        );
        expect(action.agents).toContain(seededAgentId);
        submittedActionIds.push(action.id);
        await completeHostAction({ esClient, config, action: action as never });

        // 6. The simulated acknowledgement only writes Fleet/Endpoint responses; it does not
        // mean the product observed success. Assert the action's product-observed terminal
        // state so regressions in response processing or action-status calculation fail here.
        await pollUntil(
          `the isolate action ${action.id} to complete successfully`,
          async () => {
            const details = ok(
              await api.public<{
                data: { isCompleted: boolean; wasSuccessful: boolean };
              }>('GET', `/api/endpoint/action/${action.id}`),
              'read the isolate action details'
            ).data;
            if (details.isCompleted && !details.wasSuccessful) {
              throw new Error(
                `Isolate action ${action.id} completed unsuccessfully: ${JSON.stringify(details)}`
              );
            }
            return details.isCompleted && details.wasSuccessful ? details : undefined;
          },
          { timeoutMs: testData.ACTION_TIMEOUT_MS }
        );
      }
    );
  }
);
