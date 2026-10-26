/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import type { EsClient } from '@kbn/scout-security';
import {
  AD2_SCENARIO_ALL_INDICES,
  getAd2Scenario,
} from '@kbn/evals-suite-attack-discovery-agent-builder';
import {
  apiTest,
  assertExecutionCompleted,
  attachmentData,
  cancelNewExecutions,
  citedHostNames,
  cleanupKnowledgeIndicators,
  createInvestigation,
  createServiceAccount,
  deleteInvestigation,
  deleteServiceAccount,
  dismissInvestigationProposals,
  dismissRunProposals,
  endpointIdsOf,
  ensureInvestigationsAiIndex,
  getAdminApi,
  getWorker,
  hasAttachment,
  listAttachments,
  listChatCompletionConnectors,
  listExecutionIds,
  listInvestigationProposals,
  pollUntil,
  processSelectorOf,
  readKnowledgeIndicator,
  readSeedIdentifiers,
  resetWorker,
  seedAttackScenario,
  seedKnowledgeIndicator,
  tags,
  testData,
  updateWorker,
  withAlertZeroEnabledInSpace,
  waitForExecution,
  waitForNewExecution,
} from '../fixtures';
import type { AlertZeroApi, InvestigationProposal, SeededScenario } from '../fixtures';

const WORKER_ID = testData.FORENSICS_ENDPOINT_ANALYSIS_WORKER_ID;
const RUN_WORKFLOW_ID = testData.FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID;
/** The second host of the distinguishability case; the first is the positive flow's scenario. */
const SECOND_SCENARIO_KEY = 'bits-mshta';

/** The Attack Discovery alert index the run workflow resolves the handoff target from. */
const ATTACK_DISCOVERY_ALERTS_INDEX = '.alerts-security.attack.discovery.alerts-default';

/**
 * The seeded chain a `security.analyze_endpoint` handoff resolves from: the attack chain's
 * alerts, an Attack Discovery alert that correlates them, and the Investigation to attach
 * findings to. The knowledge indicator — the handoff itself — is published separately.
 */
interface AnalysisChainContext {
  readonly scenario: SeededScenario;
  readonly attackDiscoveryAlertId: string;
  readonly investigationId: string;
  readonly hostName: string;
}

interface EndpointAnalysisContext extends AnalysisChainContext {
  readonly kiId: string;
}

/**
 * Registers a seeded resource for teardown the moment it exists. `afterAll` runs even when a
 * test body throws, so a resource is only cleanable if it was registered before the next
 * seeding step could fail — pushing these after a multi-step helper returns would leave an
 * early failure's already-indexed documents untracked.
 */
interface TeardownLedger {
  scenario(seeded: SeededScenario): void;
  attackDiscoveryAlert(id: string): void;
  investigation(id: string): void;
  knowledgeIndicator(id: string): void;
}

const scenarioHost = (scenarioKey: string): string => {
  const scenario = getAd2Scenario(scenarioKey);
  if (!scenario) {
    throw new Error(`Unknown attack scenario ${scenarioKey}`);
  }
  return scenario.host;
};

/**
 * The Attack Discovery alert the run dereferences to find its handoff target: it must exist and
 * must point at the seeded chain's alerts, and its `host.name` is the host the run resolves.
 */
const indexAttackDiscoveryAlert = async (
  esClient: EsClient,
  {
    id,
    hostName,
    alertIds,
    runMarker,
  }: { id: string; hostName: string; alertIds: readonly string[]; runMarker: string }
): Promise<void> => {
  await esClient.index({
    index: ATTACK_DISCOVERY_ALERTS_INDEX,
    id,
    refresh: 'wait_for',
    document: {
      '@timestamp': new Date().toISOString(),
      labels: { ad_portable_seed: runMarker },
      'kibana.alert.uuid': id,
      'kibana.alert.attack_discovery.alert_ids': alertIds,
      host: { name: hostName },
    },
  });
};

/**
 * Seeds everything one `security.analyze_endpoint` handoff needs except the handoff itself — the
 * attack chain's alerts, an Attack Discovery alert that correlates them, and an Investigation to
 * attach findings to. Every resource is registered with `ledger` as soon as its creation
 * succeeds, so a failure in a later step cannot orphan the earlier ones.
 */
const seedAnalysisChain = async (
  adminApi: AlertZeroApi,
  esClient: EsClient,
  scenarioKey: string,
  label: string,
  ledger: TeardownLedger
): Promise<AnalysisChainContext> => {
  const seeded = await seedAttackScenario(esClient, adminApi, { scenarioKey });
  ledger.scenario(seeded);
  const hostName = scenarioHost(scenarioKey);
  const attackDiscoveryAlertId = `e2e-${label}-${seeded.runMarker}`;

  await indexAttackDiscoveryAlert(esClient, {
    id: attackDiscoveryAlertId,
    hostName,
    alertIds: seeded.alertIds,
    runMarker: seeded.runMarker,
  });
  ledger.attackDiscoveryAlert(attackDiscoveryAlertId);

  const investigationId = await createInvestigation(
    adminApi,
    `Endpoint analysis e2e ${seeded.runMarker}`,
    `Seeded investigation for run ${seeded.runMarker}`
  );
  ledger.investigation(investigationId);

  return { scenario: seeded, attackDiscoveryAlertId, investigationId, hostName };
};

/**
 * Publishes the pending `security.analyze_endpoint` handoff for a seeded chain. Kept separate
 * from `seedAnalysisChain` because the distinguishability flow must be able to seed (and clean
 * up) a second chain before its handoff exists.
 */
const publishHandoff = async (
  adminApi: AlertZeroApi,
  esClient: EsClient,
  chain: AnalysisChainContext,
  ledger: TeardownLedger
): Promise<string> => {
  await ensureInvestigationsAiIndex(adminApi);
  const kiId = await seedKnowledgeIndicator(esClient, {
    kiId: `e2e-analyze-endpoint-${chain.scenario.runMarker}`,
    type: 'security.analyze_endpoint',
    title: `Forensics handoff for Attack Discovery ${chain.attackDiscoveryAlertId}`,
    description: `Seeded handoff for run ${chain.scenario.runMarker}`,
    attributes: {
      attack_discovery_alert_id: chain.attackDiscoveryAlertId,
      investigation_id: chain.investigationId,
    },
  });
  ledger.knowledgeIndicator(kiId);
  return kiId;
};

/** Seeds a full chain and immediately publishes its handoff: the positive flow's setup. */
const runEndpointAnalysis = async (
  adminApi: AlertZeroApi,
  esClient: EsClient,
  scenarioKey: string,
  label: string,
  ledger: TeardownLedger
): Promise<EndpointAnalysisContext> => {
  const chain = await seedAnalysisChain(adminApi, esClient, scenarioKey, label, ledger);
  const kiId = await publishHandoff(adminApi, esClient, chain, ledger);
  return { ...chain, kiId };
};

// afterAll runs even when the body throws, so the seeded state escapes through here.
const scenarios: SeededScenario[] = [];
const kiIds: string[] = [];
const attackDiscoveryAlertIds: string[] = [];
const investigationIds: string[] = [];
const ledger: TeardownLedger = {
  scenario: (seeded) => scenarios.push(seeded),
  attackDiscoveryAlert: (id) => attackDiscoveryAlertIds.push(id),
  investigation: (id) => investigationIds.push(id),
  knowledgeIndicator: (id) => kiIds.push(id),
};
/** Executions of a workflow that predate this run; teardown cancels and drains the rest. */
const executionSnapshots: Array<{ workflowId: string; knownIds: string[] }> = [];
let api: AlertZeroApi | undefined;
let esClientRef: EsClient | undefined;
let serviceAccountId: string | undefined;

apiTest.describe('AlertZero e2e - endpoint analysis', { tag: [...tags.stateful.classic] }, () => {
  // The worker routes this suite drives are gated on the per-space AlertZero setting, which the
  // server config deliberately leaves writable (an override would make it read-only and break the
  // hunt suites' baseline writes). Enable it for this suite and restore the captured baseline in
  // teardown, so the next gated suite starts from the state this one found.
  let restoreAlertZero: (() => Promise<void>) | undefined;

  apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    restoreAlertZero = await withAlertZeroEnabledInSpace({
      apiClient,
      headers: cookieHeader,
      spaceId: 'default',
    });
  });

  apiTest.afterAll(async ({ apiClient, samlAuth }) => {
    // Every step runs even when an earlier one throws, so one failure cannot leak the seeded
    // scenarios, the Attack Discovery alerts, the indicators, the investigations and their
    // pending cards, the service account or the worker.
    const errors: unknown[] = [];
    const attempt = async (step: () => Promise<unknown>) => {
      try {
        await step();
      } catch (error) {
        errors.push(error);
      }
    };
    await attempt(async () => {
      api = await getAdminApi(apiClient, samlAuth);
    });
    // Stop new dispatches first. While the worker is enabled its schedule keeps starting
    // sweeps, and `cancelNewExecutions` only cancels what it listed at call time — a sweep
    // fired mid-teardown would dispatch another analysis that either outlives the drain or
    // starts after it and survives the account and data deletion below. The account stays
    // bound until the drain is over: in-flight runs execute as it.
    await attempt(async () => {
      if (api && (await getWorker(api, WORKER_ID)).enabled) {
        await updateWorker(api, WORKER_ID, { enabled: false });
      }
    });
    // Drain the sweep before the run workflow it dispatches: a sweep that is still live when
    // the runs are drained could start a fresh run right after. The sort is stable, so
    // everything but the run workflow keeps its snapshot order.
    const drainOrder = [...executionSnapshots].sort(
      (a, b) => Number(a.workflowId === RUN_WORKFLOW_ID) - Number(b.workflowId === RUN_WORKFLOW_ID)
    );
    for (const { workflowId, knownIds } of drainOrder) {
      await attempt(async () => {
        if (api) await cancelNewExecutions(api, workflowId, knownIds);
      });
    }
    // Dismissal releases the parked run behind each pending card, and that run may still need
    // the service account — so this, too, belongs before the account teardown. The per-card
    // correlation covers the handoff-keyed proposals; the containment cards an analysis run
    // raises can carry only endpoint ids, so every tracked Investigation's pending cards are
    // dismissed by their conversation (the one id all of them share).
    await attempt(async () => {
      if (api && scenarios.length > 0) {
        await dismissRunProposals(api, {
          alertIds: scenarios.flatMap((scenario) => scenario.alertIds),
        });
      }
    });
    for (const investigationId of investigationIds) {
      await attempt(async () => {
        if (api) await dismissInvestigationProposals(api, investigationId);
      });
    }
    await attempt(async () => {
      if (api) await resetWorker(api, WORKER_ID);
    });
    await attempt(async () => {
      if (api && serviceAccountId) await deleteServiceAccount(api, serviceAccountId);
    });
    for (const investigationId of investigationIds) {
      await attempt(async () => {
        if (api) await deleteInvestigation(api, investigationId);
      });
    }
    await attempt(async () => {
      if (esClientRef && attackDiscoveryAlertIds.length > 0) {
        await esClientRef.deleteByQuery({
          index: ATTACK_DISCOVERY_ALERTS_INDEX,
          conflicts: 'proceed',
          refresh: true,
          query: { ids: { values: attackDiscoveryAlertIds } },
        });
      }
    });
    await attempt(async () => {
      if (esClientRef) await cleanupKnowledgeIndicators(esClientRef, kiIds);
    });
    for (const scenario of scenarios) {
      await attempt(async () => scenario.cleanup());
    }
    // Restore the per-space AlertZero gate this suite enabled (see beforeAll). Last and
    // best-effort: every gated-route user above has settled by now.
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

  // One flow, not two tests: the distinguishability stage below runs on the positive flow's
  // seeded chain and enabled worker, so a second test would depend on this body having run
  // (running it by title, or retrying it in a fresh worker, would throw instead of exercising
  // the regression). Playwright runs a file's tests serially in one worker, so folding the
  // stage in here keeps it deterministic.
  apiTest(
    'analyzes a seeded endpoint, cites ids that exist in the seed, and keeps two hosts distinguishable (security-team#19991)',
    async ({ apiClient, samlAuth, esClient }) => {
      apiTest.setTimeout(testData.GENERATION_TIMEOUT_MS * 3 + testData.ACTION_TIMEOUT_MS * 2);
      const adminApi = await getAdminApi(apiClient, samlAuth);
      api = adminApi;
      esClientRef = esClient;
      const startedAt = new Date().toISOString();

      // Guard: this flow is LLM-dependent end to end. When the stack was booted without a
      // chat-completion inference connector (the `alertzero` config set only wires connectors
      // when a connector source exists, which plain CI does not have), every workflow run
      // would fail on its first model call — and this suite enables the worker and seeds real
      // telemetry before that. Skip with an explicit reason instead of failing.
      const chatConnectors = await listChatCompletionConnectors(adminApi);
      apiTest.skip(
        chatConnectors.length === 0,
        'no preconfigured chat-completion inference connector on this stack; the LLM-dependent AlertZero endpoint-analysis flow requires one (agent_builder_smoke-style EIS connector source)'
      );

      // Snapshot the run workflow's executions before the worker can start any: the poll below
      // correlates on this snapshot, and teardown drains whatever appeared after it.
      const knownRunExecutionIds = await listExecutionIds(adminApi, RUN_WORKFLOW_ID);
      executionSnapshots.push({ workflowId: RUN_WORKFLOW_ID, knownIds: knownRunExecutionIds });

      const context = await runEndpointAnalysis(
        adminApi,
        esClient,
        testData.ATTACK_SCENARIO_KEY,
        'ad',
        ledger
      );

      // Same shape as P1: bind a service account, wait for the settings write to install the
      // workflow, then enable — the immediate scheduled run is the sweep under test, executing as
      // the service account so `run-as-mode: inherit` dispatches resolve.
      const account = await createServiceAccount(adminApi);
      serviceAccountId = account;
      const beforeSave = await getWorker(adminApi, WORKER_ID);
      await updateWorker(adminApi, WORKER_ID, {
        settingsRevision: beforeSave.settingsRevision ?? null,
        settings: { serviceAccountId: account },
      });
      const worker = await pollUntil(
        `worker ${WORKER_ID} to have a workflow installed`,
        async () => {
          const candidate = await getWorker(adminApi, WORKER_ID);
          return candidate.workflowId ? candidate : undefined;
        },
        { timeoutMs: testData.PROPOSAL_TIMEOUT_MS }
      );
      const workerWorkflowId = worker.workflowId;
      if (!workerWorkflowId) {
        throw new Error(`Worker ${WORKER_ID} has no workflow installed`);
      }
      const knownWorkerExecutionIds = await listExecutionIds(adminApi, workerWorkflowId);
      executionSnapshots.push({ workflowId: workerWorkflowId, knownIds: knownWorkerExecutionIds });
      expect((await updateWorker(adminApi, WORKER_ID, { enabled: true })).enabled).toBe(true);
      const sweepExecutionId = await waitForNewExecution(
        adminApi,
        workerWorkflowId,
        knownWorkerExecutionIds,
        { timeoutMs: testData.ACTION_TIMEOUT_MS }
      );
      const sweep = await waitForExecution(
        adminApi,
        'the forensics sweep execution to finish',
        sweepExecutionId,
        { timeoutMs: testData.GENERATION_TIMEOUT_MS }
      );
      await assertExecutionCompleted(adminApi, 'The forensics sweep execution', sweep);

      // The sweep dispatches one run per pending indicator, so poll for a run of THIS workflow
      // the sweep started — correlated against the run workflow's own pre-enable snapshot, not
      // the sweep workflow's (that one says nothing about which run executions predate this
      // test, so an old or unrelated run could be selected instead).
      const runExecutionId = await pollUntil(
        `an execution of ${RUN_WORKFLOW_ID} started after the sweep`,
        async () =>
          (
            await listExecutionIds(adminApi, RUN_WORKFLOW_ID)
          ).find((id) => !knownRunExecutionIds.includes(id)),
        { timeoutMs: testData.ACTION_TIMEOUT_MS }
      );
      const run = await waitForExecution(
        adminApi,
        'the endpoint analysis run execution to finish',
        runExecutionId,
        { timeoutMs: testData.GENERATION_TIMEOUT_MS }
      );
      await assertExecutionCompleted(adminApi, 'The endpoint analysis run execution', run);

      // The findings land on the investigation as timeline + IoC attachments whose ids are
      // derived from the indicator id the run was handed.
      const timelineAttachmentId = `forensic-timeline-${context.kiId}`;
      const iocsAttachmentId = `forensic-iocs-${context.kiId}`;
      const attachments = await pollUntil(
        'the forensic timeline and IoC attachments',
        async () => {
          const found = await listAttachments(adminApi, context.investigationId);
          return hasAttachment(found, timelineAttachmentId) &&
            hasAttachment(found, iocsAttachmentId)
            ? found
            : undefined;
        },
        { timeoutMs: testData.ACTION_TIMEOUT_MS }
      ).catch(async (error: Error) => {
        const seen = await listAttachments(adminApi, context.investigationId).catch(() => []);
        throw new Error(
          `${error.message}; attachments on the investigation: ${JSON.stringify(
            seen.map(({ id, client_id: clientId, type }) => ({ id, clientId, type }))
          )}`
        );
      });

      const timeline = attachmentData<{ events?: Array<{ host?: string }> }>(
        attachments,
        timelineAttachmentId
      );
      const iocs = attachmentData<{ affected_hosts?: Array<{ value?: string }> }>(
        attachments,
        iocsAttachmentId
      );
      const citedHosts = citedHostNames(timeline, iocs);

      // Structural: the analysis may only cite hosts that exist in the telemetry this run seeded
      // (a logging host, or a lateral-movement destination it names), and it must cite the host
      // its handoff resolved.
      const seed = await readSeedIdentifiers(
        esClient,
        context.scenario.runMarker,
        AD2_SCENARIO_ALL_INDICES
      );
      const knownHosts = new Set([...seed.hostNames, ...seed.destinationHosts]);
      const unknownHosts = [...new Set(citedHosts)].filter((host) => !knownHosts.has(host));
      expect(
        unknownHosts,
        `the analysis cited hosts that are not in the seed ${[...knownHosts].join(', ')}`
      ).toStrictEqual([]);
      expect(
        citedHosts,
        `the analysis must cite the seeded host ${context.hostName}; cited: ${JSON.stringify(
          citedHosts
        )}`
      ).toContain(context.hostName);

      // The containment cards are the only structured place a process target appears, so read the
      // selectors back off the cards this run raised and hold them to the same seed.
      const cards = (await listInvestigationProposals(adminApi, context.investigationId)).filter(
        (proposal) => proposal.createdAt >= startedAt
      );
      const citedEndpointIds = [...new Set(cards.flatMap(endpointIdsOf))];
      const unknownEndpointIds = citedEndpointIds.filter((id) => !seed.hostByAgentId.has(id));
      expect(
        unknownEndpointIds,
        `containment cards named endpoints that are not in the seed: ${JSON.stringify(
          unknownEndpointIds
        )}`
      ).toStrictEqual([]);
      const selectors = cards
        .map(processSelectorOf)
        .filter((selector) => selector.pid || selector.entityId);
      const unknownSelectors = selectors.filter(
        (selector) =>
          (selector.pid !== undefined && !seed.pids.has(selector.pid)) ||
          (selector.entityId !== undefined && !seed.entityIds.has(selector.entityId))
      );
      expect(
        unknownSelectors,
        `containment cards named process selectors that are not in the seed: ${JSON.stringify(
          unknownSelectors
        )}`
      ).toStrictEqual([]);
      apiTest.info().annotations.push({
        type: 'cited-vs-seed',
        description: JSON.stringify({
          seedHosts: [...seed.hostNames],
          seedDestinationHosts: [...seed.destinationHosts],
          seedEndpointIds: [...seed.hostByAgentId.keys()],
          seedEntityIds: seed.entityIds.size,
          seedPids: seed.pids.size,
          citedHosts,
          citedEndpointIds,
          citedSelectors: selectors,
        }),
      });

      // The journaling mark: the indicator leaves `pending` once the run has recorded its
      // assessment, processed or not — what matters is that the run wrote back.
      const indicator = await pollUntil(
        `indicator ${context.kiId} to leave pending`,
        async () => {
          const current = await readKnowledgeIndicator(esClient, context.kiId);
          return current.status && current.status !== 'pending' ? current : undefined;
        },
        { timeoutMs: testData.ACTION_TIMEOUT_MS }
      );
      expect(indicator.found).toBe(true);

      // Regression guard for security-team#19991: containment proposals raised for two different
      // hosts must stay distinguishable — each investigation's card must target its own seeded
      // host, and the two cards must not share one title. (The marker on the P2 branch was
      // apiTest.fail; at this head the per-action title pass-through and per-action endpoint ids
      // make the distinguishable behaviour hold, verified live, so this is now a green guard.)
      const second = await seedAnalysisChain(
        adminApi,
        esClient,
        SECOND_SCENARIO_KEY,
        'ad2',
        ledger
      );
      // The first chain's documents come out before the second handoff exists: the forensic
      // agent's telemetry lookback is not host-scoped, so with both chains indexed a scheduled
      // sweep could analyze both hosts from either handoff and raise the wrong isolate card.
      // Removing the first chain before publishing the second pins this flow to the contract
      // under test: one visible host per handoff, so each card must name its own. Both seeds'
      // identifiers are read first — the card targets resolve against documents that are gone by
      // the time the assertions run.
      const hostByAgentId = new Map<string, string>();
      for (const seeded of [context.scenario, second.scenario]) {
        const identifiers = await readSeedIdentifiers(
          esClient,
          seeded.runMarker,
          AD2_SCENARIO_ALL_INDICES
        );
        identifiers.hostByAgentId.forEach((host, agentId) => hostByAgentId.set(agentId, host));
      }
      await context.scenario.cleanup();
      await publishHandoff(adminApi, esClient, second, ledger);

      // The worker's next scheduled sweep analyzes the second handoff; each investigation must
      // end up with its own pending isolate card.
      const isolateCardOf = async (investigationId: string) =>
        (await listInvestigationProposals(adminApi, investigationId)).find(
          (proposal) => proposal.actionWorkflowId === testData.ISOLATE_HOST_ACTION_ID
        );
      const distinguishableCards = await pollUntil(
        'an isolate proposal on each of the two investigations',
        async () => {
          const [firstCard, secondCard] = await Promise.all([
            isolateCardOf(context.investigationId),
            isolateCardOf(second.investigationId),
          ]);
          return firstCard && secondCard ? { firstCard, secondCard } : undefined;
        },
        { timeoutMs: testData.GENERATION_TIMEOUT_MS }
      );

      const targetsOf = (card: InvestigationProposal) => [
        ...new Set(endpointIdsOf(card).map((id) => hostByAgentId.get(id) ?? `not-in-seed:${id}`)),
      ];
      const summary = JSON.stringify(
        {
          [context.hostName]: {
            title: distinguishableCards.firstCard.title,
            targets: targetsOf(distinguishableCards.firstCard),
          },
          [second.hostName]: {
            title: distinguishableCards.secondCard.title,
            targets: targetsOf(distinguishableCards.secondCard),
          },
        },
        null,
        2
      );

      expect(
        targetsOf(distinguishableCards.firstCard),
        `the card for ${context.hostName} must target ${context.hostName}: ${summary}`
      ).toStrictEqual([context.hostName]);
      expect(
        targetsOf(distinguishableCards.secondCard),
        `the card for ${second.hostName} must target ${second.hostName}: ${summary}`
      ).toStrictEqual([second.hostName]);
      expect(
        distinguishableCards.firstCard.title,
        `the two cards must not share one title: ${summary}`
      ).not.toBe(distinguishableCards.secondCard.title);
      apiTest.info().annotations.push({
        type: 'containment-cards',
        description: summary,
      });
    }
  );
});
