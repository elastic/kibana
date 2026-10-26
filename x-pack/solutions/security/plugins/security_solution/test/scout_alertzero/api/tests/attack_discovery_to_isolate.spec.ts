/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import type { EsClient } from '@kbn/scout-security';
import { getAd2Scenario } from '@kbn/evals-suite-attack-discovery-agent-builder';
import { seedEndpointHosts } from '../../../scout/edr_response_actions/common/seed_endpoint_hosts';
import {
  completeHostAction,
  deleteSubmittedHostActions,
} from '../../../scout/edr_response_actions/common/complete_host_action';
import {
  assertExecutionCompleted,
  apiTest,
  cancelNewExecutions,
  tags,
  testData,
  createServiceAccount,
  deleteInvestigation,
  deleteServiceAccount,
  dismissRunProposals,
  getAdminApi,
  getWorker,
  listExecutionIds,
  ok,
  pollForRunProposal,
  pollUntil,
  resetWorker,
  seedAttackScenario,
  updateWorker,
  withAlertZeroEnabledInSpace,
  listChatCompletionConnectors,
  waitForExecution,
  waitForExecutionStatus,
  waitForNewExecution,
} from '../fixtures';
import type { RunReferences, SeededScenario } from '../fixtures';

const WORKER_ID = testData.FLOOR_ATTACK_DISCOVERY_WORKER_ID;
const FORENSICS_WORKER_ID = testData.FORENSICS_ENDPOINT_ANALYSIS_WORKER_ID;

interface EndpointAction {
  id: string;
  command: string;
  agents: string[];
  startedAt: string;
}

/** Index the AlertZero generation step writes its correlated Attack Discovery alert to. */
const ATTACK_DISCOVERY_ALERTS_INDEX = '.alerts-security.attack.discovery.alerts-default';

/**
 * Deletes the Attack Discovery alerts this run minted from the flow's own index. The id is
 * chosen by the product at generation time, so teardown discovers it by correlation — an AD
 * alert whose `kibana.alert.attack_discovery.alert_ids` references one of this run's seeded
 * scenario alerts — instead of predicting it. Runs after the proposal dismissal and account
 * deletion: a still-live generation run could otherwise re-write the alert after the delete.
 */
const deleteRunAttackDiscoveryAlerts = async ({
  esClient,
  runReferences,
}: {
  esClient: EsClient;
  runReferences: RunReferences | undefined;
}): Promise<void> => {
  const alertIds = runReferences?.alertIds ?? [];
  if (alertIds.length === 0) {
    return;
  }
  await esClient.deleteByQuery({
    index: ATTACK_DISCOVERY_ALERTS_INDEX,
    conflicts: 'proceed',
    refresh: true,
    query: {
      bool: {
        should: alertIds.map((alertId) => ({
          term: { 'kibana.alert.attack_discovery.alert_ids': alertId },
        })),
        minimum_should_match: 1,
      },
    },
  });
};

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
    // Identifiers that tie this run's proposals to its seeded data; set as soon as they exist so
    // teardown can dismiss this run's proposals even when the test fails early (see afterAll).
    let runReferences: RunReferences | undefined;
    // Isolate actions submitted during the test; `cleanupHosts` only knows the seed-time ids.
    const submittedActionIds: string[] = [];
    /**
     * Workflows this run started, with the executions that existed before it enabled them:
     * teardown cancels and drains exactly this run's executions before deleting the account they
     * execute as. Disabling the workers stops new dispatches, and dismissing the proposals
     * releases the parked runs behind them — but a review still making a model call when the
     * account disappears fails against the deleted account and can raise a proposal after the
     // dismissal has already finished. The drain is what bounds that.
     */
    const executionBaselines = new Map<string, string[]>();
    // The Investigation the Investigate approval creates and the Attack Discovery alert the flow
    // generates; both are business records pointing at seed data this suite deletes, so teardown
    // removes them once the executions have settled. Both ids are minted by the product, so both
    // are captured as soon as the flow reveals them: the Investigation id is the conversation
    // behind the Investigate proposal, the alert id is discovered in teardown by query.
    let investigationId: string | undefined;

    // The worker routes this suite drives are gated on the per-space AlertZero setting, which
    // the server config deliberately leaves writable (an override would make it read-only and
    // break the hunt suites' baseline writes). Enable it for this suite and restore the captured
    // baseline in teardown.
    let restoreAlertZero: (() => Promise<void>) | undefined;

    apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      restoreAlertZero = await withAlertZeroEnabledInSpace({
        apiClient,
        headers: cookieHeader,
        spaceId: 'default',
      });
    });

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
      // Stop new dispatches first and drain what is in flight: `resetWorker` disables future
      // scheduling, but the runs the enables started keep going until they finish or are
      // cancelled, and a review still mid-model-call when the account disappears fails against
      // the deleted account and can raise a proposal after the dismissal below has finished.
      await attempt(async () => {
        if (api) await resetWorker(api, WORKER_ID);
      });
      await attempt(async () => {
        if (api) await resetWorker(api, FORENSICS_WORKER_ID);
      });
      for (const [workflowId, knownIds] of executionBaselines) {
        await attempt(async () => {
          if (api) await cancelNewExecutions(api, workflowId, knownIds);
        });
      }
      await attempt(async () =>
        deleteSubmittedHostActions({ esClient, config, actionIds: submittedActionIds })
      );
      await attempt(async () => cleanupHosts?.());
      // Dismiss this run's leftover pending proposals before the resources they point at are
      // deleted: a spec that fails between a proposal's creation and its approval otherwise
      // leaves it actionable in the shared space, and dismissal releases the parked run behind
      // it, which then ends on its declined branch while the service account still exists.
      await attempt(async () => {
        if (api && runReferences) await dismissRunProposals(api, runReferences);
      });
      await attempt(async () => {
        if (api && serviceAccountId) await deleteServiceAccount(api, serviceAccountId);
      });
      // The flow's own business records, deleted after the runs that maintain them settled: the
      // Investigation the Investigate approval created, and the Attack Discovery alert the
      // generation step wrote. Both point at telemetry and a host this teardown removes.
      await attempt(async () => {
        if (api && investigationId) await deleteInvestigation(api, investigationId);
      });
      await attempt(async () => {
        await deleteRunAttackDiscoveryAlerts({ esClient, runReferences });
      });
      await attempt(async () => scenario?.cleanup());
      // Restore the per-space AlertZero gate this suite enabled (see beforeAll).
      await attempt(async () => {
        await restoreAlertZero?.();
      });
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
        runReferences = {
          agentId: hosts.hosts[0].agentId,
          alertIds: scenario?.alertIds,
        };

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
        // Baseline the forensics workflow BEFORE its enable, same as the AD workflow: teardown
        // cancels exactly the executions each enable started, never another suite's. The worker
        // carries its workflow id now — the poll above just confirmed it.
        const forensicsWorkflowId = (await getWorker(api, FORENSICS_WORKER_ID)).workflowId;
        if (forensicsWorkflowId) {
          executionBaselines.set(
            forensicsWorkflowId,
            await listExecutionIds(api, forensicsWorkflowId)
          );
        }
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
        // Baseline before the enable: teardown (see afterAll) cancels exactly the executions
        // this enable starts — the AD workflow's scheduled run, the review it dispatches, and
        // any handoff children — never another suite's.
        executionBaselines.set(workerWorkflowId, knownExecutionIds);
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

        // 2. The review of the discovered attack proposes handing off to forensics. The poll
        // correlates each candidate with this run's seeded data (see `proposalReferencesRun`),
        // because the default space is shared and `actionWorkflowId` plus a timestamp also match
        // proposals of other AlertZero runs: an unrelated one must be skipped, not returned.
        const investigate = await pollForRunProposal(
          api,
          testData.HANDOFF_TO_FORENSICS_ACTION_ID,
          runReferences,
          { timeoutMs: testData.PROPOSAL_TIMEOUT_MS }
        );
        expect(investigate.actionInput).toBeDefined();

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

        // 3. Approve it exactly as the approval modal does; forensics now runs. The approval
        // creates the Investigation the handoff executes against: the proposal's conversation
        // is that Investigation, so capture it here for teardown.
        investigationId = investigate.conversationId;
        await approveProposal('Investigate', investigate);

        // 4. Forensics ends in an Isolate proposal for the compromised host. Same run
        // correlation as the Investigate poll: an isolate proposal of another run must be
        // skipped, so only this run's proposal can satisfy the approve below.
        const isolate = await pollForRunProposal(
          api,
          testData.ISOLATE_HOST_ACTION_ID,
          runReferences,
          { timeoutMs: testData.PROPOSAL_TIMEOUT_MS }
        );
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
