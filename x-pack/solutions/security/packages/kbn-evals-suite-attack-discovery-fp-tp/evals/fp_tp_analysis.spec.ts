/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Outcome eval for the Attack Discovery FP/TP analysis workflow (security-team#19285).
 *
 * `beforeAll` installs the sample workflow (until #19282 ships the managed one) and routes
 * the `alertzero_reasoning` inference feature to the model under test. Each task seeds a
 * fresh copy of one example's world, creates an empty Investigation, runs the workflow,
 * and grades its execution output against the contract in security-team#19280.
 *
 * Every task seeds documents under a unique suffix, so concurrent repetitions and
 * examples never read each other's alerts, events, or entities.
 */

import { randomUUID } from 'crypto';
import type { HttpHandler } from '@kbn/core/public';
import type { EvalConnector, EvaluationDataset, Example } from '@kbn/evals';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  FP_TP_INFERENCE_FEATURE_ID,
  FP_TP_MANAGED_WORKFLOW_ID,
  FP_TP_WORKFLOW_SOURCE,
} from '../src/constants';
import { evaluate, selectEvaluators, tags } from '../src/evaluate';
import {
  createFpTpTrajectoryEvaluator,
  outcomeAccuracy,
  payloadConformance,
  skipFailedRuns,
  unsafeClose,
} from '../src/evaluators';
import { overrideInferenceFeature } from '../src/inference_override';
import {
  createInvestigation,
  deleteConversation,
  waitForConversationsReady,
} from '../src/investigation';
import { kbnRequestFromFetch } from '../src/kbn_request';
import { deleteSampleWorkflow, installSampleWorkflow } from '../src/sample_workflow/install';
import { buildFpTpExampleWorld, FP_TP_EXAMPLES } from '../src/scenarios';
import { runFpTpAnalysisWorkflow } from '../src/workflow_task';
import { ensureFpTpSeedPrerequisites, seedFixture, toSeededEvidence } from '../src/world';

const SUMMARY_CRITERIA = [
  'Every id the summary or rationale cites (document ids, host.id, process.entity_id, or any other identifier) appears in output.seededIds or output.seededEvidence (the documents seeded for this run)',
  'The summary and rationale do not invent hosts, users, processes, domains, events, or entity roles that are not in output.seededEvidence (the documents this run seeded)',
  'The summary and rationale state that something actually happened only when output.seededEvidence.entities or output.seededEvidence.events show it; output.seededEvidence.attackDiscovery and output.seededEvidence.alerts are the claims under review, so presenting their story as established fact where the entities or raw events contradict it or do not show it fails this criterion',
  'The summary or rationale names the check or checks that decided the verdict (alert_linkage, entity_role, process_parent, network_destination)',
  'When the verdict is inconclusive, the summary or rationale says which evidence was missing or which checks conflicted',
  'When the entity store or raw events were empty or unavailable, the summary or rationale names that source, whatever the verdict',
];

interface FpTpDatasetExample extends Example {
  input: { exampleId: string };
  output: { outcome: string };
  metadata: { exampleId: string; scenarioKey: string; situation: string; evidenceState: string };
}

evaluate.describe('Attack Discovery FP/TP analysis', { tag: tags.stateful.classic }, () => {
  let workflowId: string = FP_TP_MANAGED_WORKFLOW_ID;
  // Set only once the sample is installed, so teardown never deletes the managed workflow.
  let installedSampleWorkflowId: string | undefined;
  let restoreInferenceSettings: (() => Promise<void>) | undefined;
  let restoreEntityExtraction: (() => Promise<void>) | undefined;
  // Cleanups that failed inside a task; afterAll retries them.
  const pendingCleanups = new Set<() => Promise<void>>();

  evaluate.beforeAll(
    async ({
      fetch,
      connector,
      log,
    }: {
      fetch: HttpHandler;
      connector: EvalConnector;
      log: ToolingLog;
    }) => {
      if (FP_TP_WORKFLOW_SOURCE === 'sample') {
        installedSampleWorkflowId = await installSampleWorkflow(fetch);
        workflowId = installedSampleWorkflowId;
        log.info(`Installed sample FP/TP analysis workflow ${workflowId}`);
      }
      restoreInferenceSettings = await overrideInferenceFeature({
        fetch,
        featureId: FP_TP_INFERENCE_FEATURE_ID,
        endpointId: connector.id,
      });
      restoreEntityExtraction = await ensureFpTpSeedPrerequisites(kbnRequestFromFetch(fetch));
      await waitForConversationsReady(fetch);
    }
  );

  evaluate.afterAll(async ({ fetch, log }: { fetch: HttpHandler; log: ToolingLog }) => {
    if (pendingCleanups.size > 0) {
      log.info(`Retrying ${pendingCleanups.size} FP/TP fixture cleanups`);
      await Promise.allSettled([...pendingCleanups].map((cleanup) => cleanup()));
    }
    await restoreEntityExtraction?.().catch((error: Error) =>
      log.warning(`Could not restart Entity Store extraction: ${error.message}`)
    );
    await restoreInferenceSettings?.().catch((error: Error) =>
      log.warning(`Could not restore inference settings: ${error.message}`)
    );
    if (installedSampleWorkflowId !== undefined) {
      const sampleId = installedSampleWorkflowId;
      await deleteSampleWorkflow(fetch, sampleId).catch((error: Error) =>
        log.warning(`Could not delete sample workflow ${sampleId}: ${error.message}`)
      );
    }
  });

  evaluate(
    'classifies seeded Attack Discoveries with the expected outcome',
    async ({ executorClient, evaluators, esClient, fetch, log, traceEsClient }) => {
      const examples: FpTpDatasetExample[] = FP_TP_EXAMPLES.map(
        ({ id, scenarioKey, situation, evidenceState, expectedOutcome }) => ({
          id,
          input: { exampleId: id },
          output: { outcome: expectedOutcome },
          metadata: { exampleId: id, scenarioKey, situation, evidenceState },
        })
      );

      await executorClient.runExperiment(
        {
          datasets: [
            {
              name: 'security: attack-discovery-fp-tp-analysis',
              description:
                'Runs the FP/TP analysis workflow against seeded U1 worlds (lookalike FP, true ' +
                'attack, missing or mixed evidence, and both failure paths) and grades the ' +
                'execution outcome and payload against the #19280 contract.',
              examples,
            } satisfies EvaluationDataset,
          ],
          task: async ({ metadata }) => {
            const { exampleId } = metadata as FpTpDatasetExample['metadata'];
            const world = buildFpTpExampleWorld(exampleId, randomUUID().slice(0, 8));
            const kbnRequest = kbnRequestFromFetch(fetch);
            const fixture = await seedFixture({
              esClient: esClient as EsClient,
              kbnRequest,
              world,
              onCleanupFailure: (cleanup) => pendingCleanups.add(cleanup),
            });
            const investigationId = await createInvestigation(
              fetch,
              `FP/TP eval ${exampleId}`
            ).catch(async (error) => {
              await fixture.cleanup().catch(() => pendingCleanups.add(fixture.cleanup));
              throw error;
            });

            let agentConversationIds: string[] = [];
            try {
              const result = await runFpTpAnalysisWorkflow({
                fetch,
                log,
                traceEsClient,
                workflowId,
                attackDiscoveryId: world.attackId,
                investigationId,
                seededIds: {
                  attackDiscoveryId: world.attackId,
                  alertIds: world.alerts.map(({ id }) => id),
                  entityIds: world.entities.map(({ id }) => id),
                  eventIds: world.events.map(({ id }) => id),
                },
                seededEvidence: toSeededEvidence(fixture.seededWorld),
                onFailedReadConversationIds: (conversationIds) => {
                  agentConversationIds = conversationIds;
                },
              });
              agentConversationIds = result.agentConversationIds;
              log.info(
                `FP/TP example ${exampleId}: outcome ${result.outcome}, coverage ${JSON.stringify(
                  result.raw?.coverage ?? null
                )} (execution ${result.executionId})${
                  result.payload ? `\n  summary: ${result.payload.summary_markdown}` : ''
                }`
              );
              return result;
            } finally {
              await fixture.cleanup().catch(() => pendingCleanups.add(fixture.cleanup));
              await deleteConversation(fetch, investigationId).catch((error: Error) =>
                log.warning(`Could not delete Investigation ${investigationId}: ${error.message}`)
              );
              for (const conversationId of agentConversationIds) {
                await deleteConversation(fetch, conversationId).catch((error: Error) =>
                  log.warning(
                    `Could not delete agent conversation ${conversationId}: ${error.message}`
                  )
                );
              }
            }
          },
        },
        selectEvaluators([
          outcomeAccuracy,
          unsafeClose,
          payloadConformance,
          createFpTpTrajectoryEvaluator(),
          skipFailedRuns(evaluators.criteria(SUMMARY_CRITERIA)),
        ])
      );
    }
  );
});
