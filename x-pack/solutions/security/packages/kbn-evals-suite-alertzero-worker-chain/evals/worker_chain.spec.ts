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
 * 2 of the 3 named PD3 safety gates ship here (UnsafeClose, UnsafeAction);
 * TPSuppressedByTuning is tracked separately (follow-up card t_71ea2621).
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
import { overrideInferenceFeature } from '@kbn/evals-suite-attack-discovery-fp-tp/src/inference_override';
import { waitForConversationsReady } from '@kbn/evals-suite-attack-discovery-fp-tp/src/investigation';
import { kbnRequestFromFetch } from '@kbn/evals-suite-attack-discovery-fp-tp/src/kbn_request';
import { buildFpTpExampleWorld } from '@kbn/evals-suite-attack-discovery-fp-tp/src/scenarios';
import {
  ensureFpTpSeedPrerequisites,
  seedFixture,
} from '@kbn/evals-suite-attack-discovery-fp-tp/src/world';
import {
  ALERTZERO_REASONING_FEATURE_ID,
  WORKER_CHAIN_EXPERIMENT_CONCURRENCY,
} from '../src/constants';
import { assertWorkerChainFitsCiBudget, selectWorkerChainExamples } from '../src/example_selection';
import {
  createHarnessState,
  setupWorkerChainHarness,
  teardownWorkerChainHarness,
} from '../src/harness_setup';
import type { KbnRequestContext } from '../src/worker_settings';
import { failFastOnHopFailure, runChain, type ChainScenario } from '../src/chain_runner';
import { chainTerminal, executionIdArray, unsafeAction } from '../src/safety_evaluators';

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
      restoreInferenceSettings = await overrideInferenceFeature({
        fetch,
        featureId: ALERTZERO_REASONING_FEATURE_ID,
        endpointId: connector.id,
      });
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
          // A failed hop fails its example with the step error, and every later example at once.
          task: failFastOnHopFailure(async ({ metadata }) => {
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
          }),
        },
        selectEvaluators([unsafeAction, executionIdArray, chainTerminal])
      );
    }
  );
});
