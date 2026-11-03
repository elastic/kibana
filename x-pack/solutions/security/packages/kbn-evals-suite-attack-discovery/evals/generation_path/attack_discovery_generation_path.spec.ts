/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Eval for the Attack Discovery batched-generation managed workflow, the path AlertZero runs
 * in production. The legacy spec calls the generate API with an explicit connector; this one
 * runs the workflow with `connector_id` omitted, so the run step resolves its model through the
 * `alertzero_*` inference features.
 *
 * `beforeAll` pins every feature a run can touch to the model under test (`model_pin.ts`).
 * Routing is then proven from the token docs: every non-judge model call must carry the
 * subject's `model.model_id`, otherwise the score is attributed to the wrong model.
 *
 * Ground truth: two multi-stage intrusions, one decoy backup chain, and noise. The fixture has
 * no malware (see `fixture.ts`). A refusal or empty completion is scored as a model failure.
 */

import type { HttpHandler } from '@kbn/core/public';
import {
  buildModelFromConnector,
  evaluate as baseEvaluate,
  getInferenceEndpointId,
  selectEvaluators,
  tags,
  type EvalConnector,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Client as EsClient } from '@elastic/elasticsearch';
import { createAttackDiscoveryBasicEvaluator } from '../../src/evaluators/attack_discovery_basic_evaluator';
import { createAttackDiscoveryCriteriaEvaluator } from '../../src/evaluators/attack_discovery_criteria_evaluator';
import { createAttackDiscoveryRubricEvaluator } from '../../src/evaluators/attack_discovery_rubric_evaluator';
import type { AttackDiscoveryDatasetExample } from '../../src/types';
import { ensureAnonymizationFields } from '../../src/generation_path/anonymization_fields';
import {
  ALERTS_INDEX,
  BATCHED_GENERATION_WORKFLOW_ID,
  PUBLIC_API_VERSION,
} from '../../src/generation_path/constants';
import {
  createAlertIdFidelityEvaluator,
  createChainCoverageEvaluator,
  createFpChainSuppressionEvaluator,
  createModelFailureEvaluator,
  createRoutingEvaluator,
} from '../../src/generation_path/evaluators';
import {
  ALL_SEEDED_IDS,
  countForeignOpenAlerts,
  GROUND_TRUTH_CRITERIA,
  REFERENCE_DISCOVERIES,
  seedAlerts,
} from '../../src/generation_path/fixture';
import {
  PINNED_INFERENCE_FEATURE_IDS,
  pinInferenceFeatures,
  type InferenceSettingsClient,
} from '../../src/generation_path/model_pin';
import { buildRoutingProof, readTokenUsage } from '../../src/generation_path/token_usage';
import {
  classifyModelFailure,
  runBatchedGenerationWorkflow,
  toAttackDiscovery,
  toTaskErrors,
  type GenerationPathTaskOutput,
} from '../../src/generation_path/workflow_task';

const LOOKBACK = '2h';

baseEvaluate.describe(
  'Attack Discovery batched generation (alertzero_* routed)',
  { tag: tags.stateful.classic },
  () => {
    let restoreInferenceSettings: (() => Promise<void>) | undefined;
    // Cleanups that failed inside a task; afterAll retries them.
    const pendingCleanups = new Set<() => Promise<void>>();

    baseEvaluate.beforeAll(
      async ({
        esClient,
        fetch,
        kbnClient,
        connector,
        log,
      }: {
        esClient: EsClient;
        fetch: HttpHandler;
        kbnClient: InferenceSettingsClient;
        connector: EvalConnector;
        log: ToolingLog;
      }) => {
        let workflow: { enabled: boolean };
        try {
          workflow = await fetch<{ enabled: boolean }>(
            `/api/workflows/workflow/${encodeURIComponent(BATCHED_GENERATION_WORKFLOW_ID)}`,
            {
              method: 'GET',
              version: PUBLIC_API_VERSION,
              headers: { 'elastic-api-version': PUBLIC_API_VERSION },
            }
          );
        } catch (error) {
          throw new Error(
            `Managed workflow "${BATCHED_GENERATION_WORKFLOW_ID}" is unavailable. It ships with the alertzero managed definitions and needs xpack.alertzero.enabled. Original error: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
        if (!workflow.enabled) {
          throw new Error(`Managed workflow "${BATCHED_GENERATION_WORKFLOW_ID}" is disabled.`);
        }

        await ensureAnonymizationFields({ esClient, fetch });

        restoreInferenceSettings = await pinInferenceFeatures({
          kbnClient,
          connectorId: connector.id,
          log,
        });
      }
    );

    baseEvaluate.afterAll(async ({ log }: { log: ToolingLog }) => {
      if (pendingCleanups.size > 0) {
        log.info(`Retrying ${pendingCleanups.size} fixture cleanups`);
        await Promise.allSettled([...pendingCleanups].map((cleanup) => cleanup()));
      }
      await restoreInferenceSettings?.().catch((error: Error) =>
        log.warning(`Could not restore inference settings: ${error.message}`)
      );
    });

    baseEvaluate(
      'generates attack discoveries from seeded alerts on the pinned model',
      async ({
        executorClient,
        evaluators,
        inferenceClient,
        evaluationConnector,
        connector,
        esClient,
        fetch,
        log,
      }) => {
        const es = esClient as unknown as EsClient;
        const subjectIds = [
          buildModelFromConnector(connector).id,
          getInferenceEndpointId(connector),
          connector.id,
        ].filter((id): id is string => typeof id === 'string' && id.length > 0);
        const judgeModelId = buildModelFromConnector(evaluationConnector).id;
        const judgeConnectorIds = [
          evaluationConnector.id,
          getInferenceEndpointId(evaluationConnector),
        ].filter((id): id is string => typeof id === 'string' && id.length > 0);

        const example: AttackDiscoveryDatasetExample = {
          input: { mode: 'searchAlerts', start: `now-${LOOKBACK}`, end: 'now' },
          output: { attackDiscoveries: REFERENCE_DISCOVERIES, criteria: GROUND_TRUTH_CRITERIA },
          metadata: {
            Title: 'two exfiltration chains, one approved-backup decoy, noise',
            pinnedFeatures: [...PINNED_INFERENCE_FEATURE_IDS],
          },
        };

        await executorClient.runExperiment(
          {
            datasets: [
              {
                name: 'security: attack-discovery-generation-path',
                description:
                  'Runs the batched-generation managed workflow with connector_id omitted over ' +
                  'seeded non-malware alerts and grades discoveries against ground truth.',
                examples: [example],
              },
            ],
            // Token docs are read by time window; one run at a time keeps them unambiguous.
            concurrency: 1,
            task: async (): Promise<GenerationPathTaskOutput> => {
              const startedAt = new Date(Date.now() - 1_000);
              const seeded = await seedAlerts({ esClient: es });
              let executionUuids: string[] = [];
              try {
                const foreignOpenAlerts = await countForeignOpenAlerts(es, LOOKBACK);
                if (foreignOpenAlerts > 0) {
                  log.warning(
                    `${foreignOpenAlerts} open alerts in the last ${LOOKBACK} are not part of the fixture; the run analyses them too.`
                  );
                }

                const { execution, output, timedOut } = await runBatchedGenerationWorkflow({
                  fetch,
                  log,
                  lookback: LOOKBACK,
                });
                executionUuids = output?.execution_uuids ?? [];

                if (!timedOut && output && (output.alerts_analyzed ?? 0) === 0) {
                  throw new Error(
                    `Execution ${execution.id} analysed 0 alerts, so the model was never called. ` +
                      `Check that the seed is retrievable (index ${ALERTS_INDEX}) and that ` +
                      `securitySolution:enableAttackDiscoveryWorkflows and the attackDiscoveryWorkflowsEnabled flag are on.`
                  );
                }

                const insights = (output?.attack_discoveries ?? []).map(toAttackDiscovery);
                const cited = [...new Set(insights.flatMap(({ alertIds }) => alertIds))];
                const notSeeded = cited.filter((id) => !ALL_SEEDED_IDS.has(id));
                let unknownAlertIds = notSeeded;
                if (notSeeded.length > 0) {
                  const existing = await es.search<{ 'kibana.alert.uuid'?: string }>({
                    index: ALERTS_INDEX,
                    size: notSeeded.length,
                    _source: ['kibana.alert.uuid'],
                    query: {
                      bool: {
                        should: [
                          { ids: { values: notSeeded } },
                          { terms: { 'kibana.alert.uuid': notSeeded } },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  });
                  const found = new Set(
                    existing.hits.hits.flatMap(({ _id, _source }) => [
                      _id,
                      _source?.['kibana.alert.uuid'],
                    ])
                  );
                  unknownAlertIds = notSeeded.filter((id) => !found.has(id));
                }

                const routing = buildRoutingProof({
                  records: await readTokenUsage({ esClient: es, since: startedAt }),
                  subjectModelId: subjectIds,
                  judgeConnectorIds,
                  judgeModelId,
                });
                log.info(
                  `Routing: ${routing.subjectCalls} subject calls (${routing.judgeCalls} judge), ` +
                    `models [${routing.modelIds.join(', ')}], features [${routing.featureIds.join(
                      ', '
                    )}], ` +
                    `connectors [${routing.connectorIds.join(', ')}], misrouted ${
                      routing.misrouted.length
                    }`
                );

                return {
                  insights: insights.length > 0 ? insights : null,
                  errors: toTaskErrors(output?.batch_errors),
                  raw: output,
                  executionId: execution.id,
                  executionStatus: execution.status,
                  timedOut,
                  unknownAlertIds,
                  foreignAlertIds: notSeeded.filter((id) => !unknownAlertIds.includes(id)),
                  foreignOpenAlerts,
                  routing,
                  modelFailure: classifyModelFailure({ execution, output, timedOut }),
                };
              } finally {
                await seeded
                  .removeDiscoveries(executionUuids)
                  .catch((error: Error) =>
                    log.warning(`Could not remove persisted discoveries: ${error.message}`)
                  );
                await seeded.cleanup().catch((error: Error) => {
                  log.warning(`Could not remove seeded alerts: ${error.message}`);
                  pendingCleanups.add(seeded.cleanup);
                });
              }
            },
          },
          selectEvaluators<AttackDiscoveryDatasetExample, GenerationPathTaskOutput>([
            createModelFailureEvaluator(),
            createAlertIdFidelityEvaluator(),
            createChainCoverageEvaluator(),
            createFpChainSuppressionEvaluator(),
            createRoutingEvaluator(),
            createAttackDiscoveryBasicEvaluator(),
            createAttackDiscoveryCriteriaEvaluator({ evaluators }),
            createAttackDiscoveryRubricEvaluator({
              inferenceClient: inferenceClient.bindTo({ connectorId: evaluationConnector.id }),
              log,
            }),
          ])
        );
      }
    );
  }
);
