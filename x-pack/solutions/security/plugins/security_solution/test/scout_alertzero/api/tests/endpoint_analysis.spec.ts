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
  citedHostNames,
  cleanupKnowledgeIndicators,
  createInvestigation,
  createServiceAccount,
  deleteServiceAccount,
  endpointIdsOf,
  ensureInvestigationsAiIndex,
  getAdminApi,
  getWorker,
  hasAttachment,
  listAttachments,
  listExecutionIds,
  listPendingProposals,
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
  waitForExecution,
  waitForNewExecution,
} from '../fixtures';
import type { AlertZeroApi, PendingProposal, SeededScenario } from '../fixtures';

const WORKER_ID = testData.FORENSICS_ENDPOINT_ANALYSIS_WORKER_ID;
const RUN_WORKFLOW_ID = testData.FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID;
/** The second host of the distinguishability case; the first is the positive flow's scenario. */
const SECOND_SCENARIO_KEY = 'bits-mshta';

/** The Attack Discovery alert index the run workflow resolves the handoff target from. */
const ATTACK_DISCOVERY_ALERTS_INDEX = '.alerts-security.attack.discovery.alerts-default';

interface EndpointAnalysisContext {
  readonly scenario: SeededScenario;
  readonly kiId: string;
  readonly attackDiscoveryAlertId: string;
  readonly investigationId: string;
  readonly hostName: string;
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
 * Seeds everything one `security.analyze_endpoint` handoff needs — the attack chain's alerts, an
 * Attack Discovery alert that correlates them, and an Investigation to attach findings to — then
 * enables the forensics worker and lets its scheduled sweep run as the worker's service account.
 */
const runEndpointAnalysis = async (
  adminApi: AlertZeroApi,
  esClient: EsClient,
  scenarioKey: string,
  label: string
): Promise<EndpointAnalysisContext> => {
  const seeded = await seedAttackScenario(esClient, adminApi, { scenarioKey });
  const hostName = scenarioHost(scenarioKey);
  const attackDiscoveryAlertId = `e2e-${label}-${seeded.runMarker}`;

  await indexAttackDiscoveryAlert(esClient, {
    id: attackDiscoveryAlertId,
    hostName,
    alertIds: seeded.alertIds,
    runMarker: seeded.runMarker,
  });

  const investigationId = await createInvestigation(
    adminApi,
    `Endpoint analysis e2e ${seeded.runMarker}`,
    `Seeded investigation for run ${seeded.runMarker}`
  );
  await ensureInvestigationsAiIndex(adminApi);
  const kiId = await seedKnowledgeIndicator(esClient, {
    kiId: `e2e-analyze-endpoint-${seeded.runMarker}`,
    type: 'security.analyze_endpoint',
    title: `Forensics handoff for Attack Discovery ${attackDiscoveryAlertId}`,
    description: `Seeded handoff for run ${seeded.runMarker}`,
    attributes: {
      attack_discovery_alert_id: attackDiscoveryAlertId,
      investigation_id: investigationId,
    },
  });

  return { scenario: seeded, kiId, attackDiscoveryAlertId, investigationId, hostName };
};

// afterAll runs even when the body throws, so the seeded state escapes through here.
const scenarios: SeededScenario[] = [];
const kiIds: string[] = [];
const attackDiscoveryAlertIds: string[] = [];
let api: AlertZeroApi | undefined;
let esClientRef: EsClient | undefined;
let serviceAccountId: string | undefined;
let workerWorkflowId: string | undefined;
let firstAnalysis: EndpointAnalysisContext | undefined;

apiTest.describe('AlertZero e2e - endpoint analysis', { tag: [...tags.stateful.classic] }, () => {
  apiTest.afterAll(async ({ apiClient, samlAuth }) => {
    // Every step runs even when an earlier one throws, so one failure cannot leak the seeded
    // scenarios, the Attack Discovery alerts, the indicators, the service account or the worker.
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
    await attempt(async () => {
      if (api) await resetWorker(api, WORKER_ID);
    });
    await attempt(async () => {
      if (api && serviceAccountId) await deleteServiceAccount(api, serviceAccountId);
    });
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
    if (errors.length > 0) {
      throw new Error(
        `AlertZero e2e cleanup failed: ${errors
          .map((error) => (error instanceof Error ? error.message : String(error)))
          .join('; ')}`
      );
    }
  });

  apiTest(
    'analyzes a seeded endpoint and cites ids that exist in the seed',
    async ({ apiClient, samlAuth, esClient }) => {
      apiTest.setTimeout(testData.GENERATION_TIMEOUT_MS * 2);
      const adminApi = await getAdminApi(apiClient, samlAuth);
      api = adminApi;
      esClientRef = esClient;
      const startedAt = new Date().toISOString();

      const context = await runEndpointAnalysis(
        adminApi,
        esClient,
        testData.ATTACK_SCENARIO_KEY,
        'ad'
      );
      firstAnalysis = context;
      scenarios.push(context.scenario);
      kiIds.push(context.kiId);
      attackDiscoveryAlertIds.push(context.attackDiscoveryAlertId);

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
      workerWorkflowId = worker.workflowId;
      if (!workerWorkflowId) {
        throw new Error(`Worker ${WORKER_ID} has no workflow installed`);
      }
      const knownExecutionIds = await listExecutionIds(adminApi, workerWorkflowId);
      expect((await updateWorker(adminApi, WORKER_ID, { enabled: true })).enabled).toBe(true);
      const sweepExecutionId = await waitForNewExecution(
        adminApi,
        workerWorkflowId,
        knownExecutionIds,
        { timeoutMs: testData.ACTION_TIMEOUT_MS }
      );
      const sweep = await waitForExecution(
        adminApi,
        'the forensics sweep execution to finish',
        sweepExecutionId,
        { timeoutMs: testData.GENERATION_TIMEOUT_MS }
      );
      await assertExecutionCompleted(adminApi, 'The forensics sweep execution', sweep);

      // The sweep dispatches one run per pending indicator, so poll for a run of THIS workflow the
      // sweep started rather than assuming the sweep's only dispatch is ours.
      const runExecutionId = await pollUntil(
        `an execution of ${RUN_WORKFLOW_ID} started after the sweep`,
        async () =>
          (
            await listExecutionIds(adminApi, RUN_WORKFLOW_ID)
          ).find((id) => !knownExecutionIds.includes(id)),
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
      const cards = (await listPendingProposals(adminApi, context.investigationId)).filter(
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
    }
  );

  // Regression guard for security-team#19991: containment proposals raised for two different
  // hosts must stay distinguishable — each investigation's card must target its own seeded host,
  // and the two cards must not share one title. (The marker on the P2 branch was apiTest.fail;
  // at this head the per-action title pass-through and per-action endpoint ids make the
  // distinguishable behaviour hold, verified live, so this is now a green guard.)
  apiTest(
    'keeps containment proposals for two hosts distinguishable (security-team#19991)',
    async ({ apiClient, samlAuth, esClient }) => {
      apiTest.setTimeout(testData.GENERATION_TIMEOUT_MS + 2 * testData.ACTION_TIMEOUT_MS);
      esClientRef = esClient;
      const adminApi = api ?? (await getAdminApi(apiClient, samlAuth));
      const first = firstAnalysis;
      if (!first || !workerWorkflowId) {
        throw new Error('the green endpoint analysis test must run first');
      }

      const second = await runEndpointAnalysis(adminApi, esClient, SECOND_SCENARIO_KEY, 'ad2');
      scenarios.push(second.scenario);
      kiIds.push(second.kiId);
      attackDiscoveryAlertIds.push(second.attackDiscoveryAlertId);
      // The first chain's documents come out before the second handoff runs: the forensic
      // agent's telemetry lookback is not host-scoped, so with both chains indexed the second
      // analysis can legitimately see — and act on — the first host (observed live: both cards
      // reading "Isolate host wks-alice-01"). Removing the first chain pins this test to the
      // contract under test: one visible host per handoff, so each card must name its own.
      await first.scenario.cleanup();

      // The worker's next scheduled sweep analyzes the second handoff; each investigation must
      // end up with its own pending isolate card.
      const isolateCardOf = async (investigationId: string) =>
        (await listPendingProposals(adminApi, investigationId)).find(
          (proposal) => proposal.actionWorkflowId === testData.ISOLATE_HOST_ACTION_ID
        );
      const cards = await pollUntil(
        'an isolate proposal on each of the two investigations',
        async () => {
          const [firstCard, secondCard] = await Promise.all([
            isolateCardOf(first.investigationId),
            isolateCardOf(second.investigationId),
          ]);
          return firstCard && secondCard ? { firstCard, secondCard } : undefined;
        },
        { timeoutMs: testData.GENERATION_TIMEOUT_MS }
      );

      const hostByAgentId = new Map<string, string>();
      for (const seeded of [first.scenario, second.scenario]) {
        const identifiers = await readSeedIdentifiers(
          esClient,
          seeded.runMarker,
          AD2_SCENARIO_ALL_INDICES
        );
        identifiers.hostByAgentId.forEach((host, agentId) => hostByAgentId.set(agentId, host));
      }
      const targetsOf = (card: PendingProposal) => [
        ...new Set(endpointIdsOf(card).map((id) => hostByAgentId.get(id) ?? `not-in-seed:${id}`)),
      ];
      const summary = JSON.stringify(
        {
          [first.hostName]: { title: cards.firstCard.title, targets: targetsOf(cards.firstCard) },
          [second.hostName]: {
            title: cards.secondCard.title,
            targets: targetsOf(cards.secondCard),
          },
        },
        null,
        2
      );

      expect(
        targetsOf(cards.firstCard),
        `the card for ${first.hostName} must target ${first.hostName}: ${summary}`
      ).toStrictEqual([first.hostName]);
      expect(
        targetsOf(cards.secondCard),
        `the card for ${second.hostName} must target ${second.hostName}: ${summary}`
      ).toStrictEqual([second.hostName]);
      expect(cards.firstCard.title, `the two cards must not share one title: ${summary}`).not.toBe(
        cards.secondCard.title
      );
      apiTest.info().annotations.push({
        type: 'containment-cards',
        description: summary,
      });
    }
  );
});
