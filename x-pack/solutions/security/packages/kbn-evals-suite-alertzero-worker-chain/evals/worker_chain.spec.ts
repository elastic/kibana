/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * L4 worker-chain eval: Alert Triage + Attack Discovery first (PD2).
 *
 * Live runs are executed only via a `route: local` evals child on
 * orca-eval-controller against a real stack with the alertzero plugin enabled
 * and the alertzero_reasoning connector routed to the model under test. This
 * spec wires the deterministic safety family (UnsafeClose, UnsafeAction,
 * ExecutionIdArray) over the ChainRunRecord the harness produces; the safety
 * table is reported separately and is never averaged (PD3).
 *
 * All 3 named PD3 safety gates are wired here (UnsafeClose, UnsafeAction,
 * TPSuppressedByTuning). A separate default-space seeded Rule Tuning case
 * drives operator-approved proposals against a rule with a labelled TP.
 * Cases with no executed suppressing action still report not_exercised (null).
 */

// eslint-disable-next-line import/no-nodejs-modules
import { randomUUID } from 'crypto';
import type { HttpHandler } from '@kbn/core/public';
import type { EvalConnector, EvaluationDataset, Example } from '@kbn/evals';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  evaluate,
  selectEvaluators,
  tags,
} from '@kbn/evals-suite-attack-discovery-fp-tp/src/evaluate';
import { waitForConversationsReady } from '@kbn/evals-suite-attack-discovery-fp-tp/src/investigation';
import { kbnRequestFromFetch } from '@kbn/evals-suite-attack-discovery-fp-tp/src/kbn_request';
import { buildFpTpExampleWorld } from '@kbn/evals-suite-attack-discovery-fp-tp/src/scenarios';
import {
  ensureFpTpSeedPrerequisites,
  seedFixture,
} from '@kbn/evals-suite-attack-discovery-fp-tp/src/world';
import { WORKER_CHAIN_EXPERIMENT_CONCURRENCY, WORKER_IDS } from '../src/constants';
import {
  assertInvestigateRuleSkillRegistered,
  bindWorkerChainInferenceFeatures,
} from '../src/harness_preflight';
import { assertWorkerChainFitsCiBudget, selectWorkerChainExamples } from '../src/example_selection';
import {
  createHarnessState,
  setupWorkerChainHarness,
  teardownWorkerChainHarness,
} from '../src/harness_setup';
import type { KbnRequestContext } from '../src/worker_settings';
import { runChain, type ChainScenario } from '../src/chain_runner';
import { runSeededRuleTuningScenario, type TuningFamily } from '../src/rule_tuning_fixture';
import {
  chainTerminal,
  executionIdArray,
  tpSuppressedByTuning,
  unsafeAction,
} from '../src/safety_evaluators';

/** Space the cell runs in. A worker service account in another space (G20) is a change here only. */
const SPACE_ID = process.env.ALERTZERO_EVAL_SPACE_ID ?? 'default';

interface ChainDatasetExample extends Example {
  input: { exampleId: string };
  output: { goldVerdict: ChainScenario['goldVerdict'] };
  metadata: { exampleId: string; goldVerdict: ChainScenario['goldVerdict'] };
}

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

evaluate.describe('AlertZero L4 worker chain', { tag: tags.stateful.classic }, () => {
  const ctxOf = (fetch: HttpHandler): KbnRequestContext => ({ fetch, spaceId: SPACE_ID });
  /** Everything setup changed (B4 snapshots, the AlertZero setting), put back in afterAll even when a run fails. */
  const harness = createHarnessState();
  let restoreInferenceSettings: (() => Promise<void>) | undefined;
  let candidateConnectorId: string | undefined;
  let restoreEntityExtraction: (() => Promise<void>) | undefined;
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
      assertWorkerChainFitsCiBudget();
      // Fail before measuring anything if the Rule Tuning review's skill is not registered.
      await assertInvestigateRuleSkillRegistered(fetch);
      restoreInferenceSettings = await bindWorkerChainInferenceFeatures(fetch, connector.id);
      candidateConnectorId = connector.id;
      restoreEntityExtraction = await ensureFpTpSeedPrerequisites(kbnRequestFromFetch(fetch));
      await waitForConversationsReady(fetch);
      // Applied, not declared: enable the AlertZero setting, provision the Worker service
      // accounts, then capture -> write -> verify each Worker (see harness_setup.ts).
      await setupWorkerChainHarness({
        fetch,
        ctx: ctxOf(fetch),
        state: harness,
        log,
        pinnedServiceAccountId: asString(process.env.ALERTZERO_EVAL_SERVICE_ACCOUNT_ID),
      });
      log.info('AlertZero worker-chain harness ready');
    }
  );

  evaluate.afterAll(async ({ fetch, log }: { fetch: HttpHandler; log: ToolingLog }) => {
    if (pendingCleanups.size > 0) {
      await Promise.allSettled([...pendingCleanups].map((cleanup) => cleanup()));
    }
    await teardownWorkerChainHarness({ ctx: ctxOf(fetch), state: harness, log });
    await restoreEntityExtraction?.().catch((error: Error) =>
      log.warning(`Could not restart Entity Store extraction: ${error.message}`)
    );
    await restoreInferenceSettings?.().catch((error: Error) =>
      log.warning(`Could not restore inference settings: ${error.message}`)
    );
  });

  evaluate(
    'runs triage and attack discovery over seeded alerts and applies the safety gates',
    async ({ executorClient, esClient, fetch, log }) => {
      // WORKER_CHAIN_EXAMPLES (ids and/or `smoke6`) narrows the run; an unknown id
      // throws here rather than silently running a different set.
      const examples: ChainDatasetExample[] = selectWorkerChainExamples().map(
        ({ id, expectedOutcome }) => ({
          id,
          input: { exampleId: id },
          output: { goldVerdict: expectedOutcome as ChainScenario['goldVerdict'] },
          metadata: { exampleId: id, goldVerdict: expectedOutcome as ChainScenario['goldVerdict'] },
        })
      );

      await executorClient.runExperiment(
        {
          datasets: [
            {
              name: 'security: alertzero-worker-chain',
              description:
                'Seeds the authored FP/TP worlds, fires Alert Triage then Attack Discovery ' +
                'against the seeded alerts, and grades the recorded chain with the safety ' +
                'gates. The safety table is reported separately and never averaged.',
              examples,
            } satisfies EvaluationDataset,
          ],
          // B2: one example at a time. seedFixture/cleanup run in the task but
          // outside runChain's queue, and the AD worker scans the whole space, so
          // at the default concurrency another example's alerts and reviews leak
          // into this one. Also overrides --concurrency / EVAL_CONCURRENCY.
          concurrency: WORKER_CHAIN_EXPERIMENT_CONCURRENCY,
          task: async ({ metadata }) => {
            const { exampleId, goldVerdict } = metadata as ChainDatasetExample['metadata'];
            const world = buildFpTpExampleWorld(exampleId, randomUUID().slice(0, 8));
            const fixture = await seedFixture({
              esClient: esClient as EsClient,
              kbnRequest: kbnRequestFromFetch(fetch),
              world,
              onCleanupFailure: (cleanup) => pendingCleanups.add(cleanup),
            });
            try {
              const [firstAlert] = world.alerts;
              const scenario: ChainScenario = {
                key: exampleId,
                workerChain: ['alert-triage', 'attack-discovery'],
                declaredAutonomy: { 'alert-triage': 'supervised', 'attack-discovery': 'manual' },
                alerts: world.alerts.map(({ id, source }) => ({
                  id,
                  hostId: asString((source.host as { id?: unknown } | undefined)?.id),
                })),
                rule: {
                  id: asString(firstAlert?.source['kibana.alert.rule.uuid']) ?? 'seeded-rule',
                  name: asString(firstAlert?.source['kibana.alert.rule.name']) ?? 'Seeded rule',
                },
                goldVerdict,
              };
              const record = await runChain({
                ctx: ctxOf(fetch),
                log,
                scenario,
                // F1: the seeded alert documents are read back from the seeded
                // alerts index via mget, so the triage run receives the same
                // full-doc event the product's alert trigger emits.
                alertStore: {
                  mget: (p) =>
                    (
                      esClient as unknown as {
                        mget(params: unknown): Promise<unknown>;
                      }
                    ).mget(p) as never,
                },
                baseSha: process.env.ALERTZERO_EVAL_BASE_SHA ?? 'unknown',
                triageTrigger: 'manual-event',
                forensicsSweepMode: 'blocked',
                runAsIdentities: {
                  usernames: Object.values(harness.workerServiceAccounts),
                },
              });
              return { record };
            } finally {
              await fixture.cleanup().catch(() => pendingCleanups.add(fixture.cleanup));
            }
          },
        },
        selectEvaluators([unsafeAction, executionIdArray, chainTerminal, tpSuppressedByTuning])
      );
    }
  );

  evaluate(
    'runs seeded Rule Tuning with operator-approved actions',
    async ({ executorClient, fetch, esClient, log }) => {
      evaluate.skip(
        SPACE_ID !== 'default',
        'Seeded Rule Tuning requires a dedicated default-space stack'
      );
      const families: TuningFamily[] = ['encoded-powershell', 'mimicrat-clickfix'];
      await executorClient.runExperiment(
        {
          datasets: [
            {
              name: 'alertzero-rule-tuning-tp-control',
              description: 'Assisted Rule Tuning with operator approval and a labelled TP rule',
              examples: families.map((family) => ({
                input: { family },
                output: {},
                metadata: { family },
              })),
            },
          ],
          concurrency: WORKER_CHAIN_EXPERIMENT_CONCURRENCY,
          task: async ({ input }) => {
            const record = await runSeededRuleTuningScenario({
              operator: ctxOf(fetch),
              esClient,
              family: input.family as TuningFamily,
              autonomy: 'assisted',
              approve: true,
              baseSha: asString(process.env.KIBANA_BUILD_SHA) ?? 'unknown',
              runAsIdentity: harness.workerServiceAccounts[WORKER_IDS.ruleTuning],
              expectedConnectorId: candidateConnectorId,
            });
            log.info(`Rule Tuning run ${record.runId}: ${record.actions.length} proposals`);
            return { record };
          },
        },
        selectEvaluators([unsafeAction, tpSuppressedByTuning, chainTerminal])
      );
    }
  );
});
