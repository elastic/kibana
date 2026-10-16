/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdir, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import { FP_TP_INFERENCE_FEATURE_ID } from '../src/constants';
import { createLiveKbnRequest } from '../src/world';
import {
  assertWorkerModeSpace,
  buildWorkerModePlan,
  cleanupWorkerModeSpace,
  enableAdWorker,
  ensureWorkerModePrerequisites,
  findGeneratedAttacks,
  formatWorkerModeReport,
  readGenerationErrors,
  resolveWorkerModeExample,
  seedWorkerModePlan,
  startFloorRun,
  toWorkerModeAttackResults,
  toWorkerModeManifest,
  waitForFloorRun,
  waitForReviews,
  WORKER_MODE_OUTCOMES,
  type WorkerModeOutcome,
  type WorkerModeSeedPlan,
  type WorkerModeTriggerResult,
} from '../src/worker_mode';

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const toOutcome = (value: string | undefined): WorkerModeOutcome | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const outcome = WORKER_MODE_OUTCOMES.find((candidate) => candidate === value);
  if (outcome === undefined) {
    throw new Error(`--outcome must be one of ${WORKER_MODE_OUTCOMES.join(', ')}`);
  }
  return outcome;
};

const writeManifest = async (
  path: string,
  plan: WorkerModeSeedPlan,
  trigger?: WorkerModeTriggerResult
): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(toWorkerModeManifest(plan, trigger), null, 2)}\n`);
};

run(
  async ({ flags, log }) => {
    const space = assertWorkerModeSpace(optionalString(flags.space));
    const example = resolveWorkerModeExample({
      outcome: toOutcome(optionalString(flags.outcome)),
      exampleId: optionalString(flags.example),
    });
    const apiKey = optionalString(flags.apiKey);
    const username = String(flags.username);
    const password = String(flags.password);
    const waitMs = Number(flags.waitMinutes) * 60_000;
    if (!Number.isFinite(waitMs) || waitMs <= 0) {
      throw new Error('--waitMinutes must be a positive number');
    }

    const esClient = new Client({
      node: String(flags.elasticsearchUrl),
      auth: apiKey !== undefined ? { apiKey } : { username, password },
    });
    const kbnRequest = createLiveKbnRequest({
      kibanaUrl: String(flags.kibanaUrl),
      apiKey,
      username,
      password,
      space,
    });

    try {
      const connectorId = await ensureWorkerModePrerequisites({
        esClient,
        kbnRequest,
        space,
        reasoningConnectorId: optionalString(flags.reasoningConnectorId),
      });
      log.info(`${FP_TP_INFERENCE_FEATURE_ID} → ${connectorId}`);

      const cleaned = await cleanupWorkerModeSpace({ esClient, kbnRequest, space });
      log.info(
        `Removed ${cleaned.alerts} earlier seeded alert(s) and their events and entities on ${cleaned.hostIds.length} host(s)`
      );

      const plan = buildWorkerModePlan({ space, exampleId: example.id });
      await seedWorkerModePlan({ esClient, kbnRequest, plan });
      const manifestPath = resolve(
        optionalString(flags.manifest) ??
          resolve(__dirname, '../target/ad_worker_fp_tp', `${space}-${plan.runMarker}.json`)
      );
      await writeManifest(manifestPath, plan);

      log.success(
        `Seeded ${plan.exampleId} into space ${space} (expected ${plan.expectedOutcome})`
      );
      log.info(`Run marker: ${plan.runMarker}`);
      log.info(
        `Alerts: ${plan.alertIds.length}; events: ${plan.events.length}; entities: ${plan.entities.length}`
      );
      log.info(`Hosts: ${plan.hostIds.join(', ')}`);
      log.info(`Last alert at ${plan.lastAlertAt}`);
      log.info(
        `Run the AD Worker before ${plan.windowDeadline}: later, the analysis's ±2h raw-event window misses the seeded events`
      );
      log.info(`Manifest: ${manifestPath}`);

      if (!flags.trigger) {
        return;
      }

      const { workflowId, enabledNow } = await enableAdWorker({
        kbnRequest,
        serviceAccountId: optionalString(flags.serviceAccountId),
      });
      log.info(`AD Worker enabled (manual autonomy); floor workflow ${workflowId}`);

      const deadline = Date.now() + waitMs;
      const floorExecutionId = await startFloorRun({
        kbnRequest,
        workflowId,
        since: plan.seededAt,
        enabledNow,
      });
      log.info(`Floor run ${floorExecutionId} started; waiting for generation`);
      const floor = await waitForFloorRun({
        kbnRequest,
        workflowId,
        executionId: floorExecutionId,
        deadline,
        log,
      });

      const attacks = await findGeneratedAttacks({
        esClient,
        space,
        alertIds: plan.alertIds,
        since: plan.seededAt,
      });
      if (Date.now() > Date.parse(plan.windowDeadline)) {
        log.warning(
          `Generation finished after ${plan.windowDeadline}; the analysis may not see the seeded raw events`
        );
      }
      const reviews =
        attacks.length === 0
          ? []
          : await waitForReviews({
              kbnRequest,
              attackIds: attacks.map(({ attackId }) => attackId),
              deadline,
              log,
            });

      const result: WorkerModeTriggerResult = {
        floorWorkflowId: workflowId,
        floorExecutionId: floor.id,
        floorStatus: floor.status,
        generatedAt: new Date().toISOString(),
        attacks: toWorkerModeAttackResults(attacks, reviews, plan.expectedOutcome),
        ...(attacks.length === 0
          ? { generationErrors: await readGenerationErrors(kbnRequest, floor.id) }
          : {}),
      };
      await writeManifest(manifestPath, plan, result);
      for (const line of formatWorkerModeReport(plan, result)) {
        log.info(line);
      }

      const notPassed = result.attacks.filter(({ status }) => status !== 'PASS');
      if (result.attacks.length === 0 || notPassed.length > 0) {
        throw new Error(
          result.attacks.length === 0
            ? 'No attack generated from the seeded alerts'
            : `${notPassed.length} of ${result.attacks.length} attack(s) did not reach ${plan.expectedOutcome}`
        );
      }
    } finally {
      await esClient.close();
    }
  },
  {
    description: `
      Seeds one FP/TP example for the AlertZero Attack Discovery Worker: detection alerts,
      Entity Store entities and raw endpoint events only, with no Attack Discovery, so the
      Worker generates the attack and its review runs the FP/TP analysis. Seeds a dedicated
      non-default space under a fresh run marker, after removing earlier seeds there.
      --trigger also enables the Worker, runs it, and grades each review's verdict.
    `,
    flags: {
      string: [
        'space',
        'outcome',
        'example',
        'kibanaUrl',
        'elasticsearchUrl',
        'username',
        'password',
        'apiKey',
        'reasoningConnectorId',
        'serviceAccountId',
        'manifest',
        'waitMinutes',
      ],
      boolean: ['trigger'],
      default: {
        kibanaUrl: 'http://127.0.0.1:5601',
        elasticsearchUrl: 'http://127.0.0.1:9200',
        username: 'elastic',
        password: 'changeme',
        waitMinutes: '45',
      },
      help: `
        --space                 Dedicated Kibana space to seed (required; not "default")
        --outcome               fp | tp | inconclusive: seeds that outcome's default example
        --example               Any example id with a non-failed gold, instead of --outcome
        --trigger               Enable the AD Worker (manual autonomy), run it, wait for the
                                reviews and print each attack's verdict against the gold
        --kibanaUrl             Kibana URL (Default: http://127.0.0.1:5601)
        --elasticsearchUrl      Elasticsearch URL (Default: http://127.0.0.1:9200)
        --username              Basic auth username (Default: elastic)
        --password              Basic auth password (Default: changeme)
        --apiKey                ApiKey for Kibana and Elasticsearch; overrides Basic auth
        --reasoningConnectorId  Connector to map alertzero_frontier to in the space
                                (Default: keep the existing mapping; one is required)
        --serviceAccountId      Service account the Worker runs as (Default: the stored one,
                                else alertzero_attack_discovery, created if missing)
        --manifest              Manifest path (Default: target/ad_worker_fp_tp/<space>-<marker>.json
                                in this package)
        --waitMinutes           How long --trigger waits for generation and reviews (Default: 45)
      `,
    },
  }
);
