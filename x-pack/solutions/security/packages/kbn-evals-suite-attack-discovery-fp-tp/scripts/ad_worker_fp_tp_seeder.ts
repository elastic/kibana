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
import { assertServerlessSpace, createLiveKbnRequest } from '../src/world';
import {
  assertWorkerModeSpace,
  buildWorkerModePlan,
  cleanupWorkerModeSpace,
  ensureWorkerModePrerequisites,
  ensureWorkerModeSpace,
  hostUserFromAlerts,
  readWorkerModeHostUser,
  resolveWorkerModeExample,
  seedWorkerModePlan,
  toWorkerModeManifest,
  WORKER_MODE_OUTCOMES,
  type WorkerModeHostUser,
  type WorkerModeOutcome,
  type WorkerModeSeedPlan,
} from '../src/worker_mode';

/** Read when `--apiKey` is not passed, so the key stays out of shell history and `ps`. */
const API_KEY_ENV_VAR = 'FP_TP_API_KEY';

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const MAX_SETS = 20;

const toSetCount = (value: unknown): number => {
  const count = Number(value ?? 1);
  if (!Number.isInteger(count) || count < 1 || count > MAX_SETS) {
    throw new Error(`--sets must be an integer from 1 to ${MAX_SETS}`);
  }
  return count;
};

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

const writeManifest = async (path: string, plan: WorkerModeSeedPlan): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(toWorkerModeManifest(plan), null, 2)}\n`);
};

run(
  async ({ flags, log }) => {
    const serverless = Boolean(flags.serverless);
    const space = serverless
      ? assertServerlessSpace(optionalString(flags.space))
      : assertWorkerModeSpace(optionalString(flags.space));
    const sets = toSetCount(flags.sets);
    const append = flags.append === true;
    const example = resolveWorkerModeExample({
      outcome: toOutcome(optionalString(flags.outcome)),
      exampleId: optionalString(flags.example),
    });
    const apiKey = optionalString(flags.apiKey) ?? optionalString(process.env[API_KEY_ENV_VAR]);
    const username = String(flags.username);
    const password = String(flags.password);

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
      const spaceCreated = await ensureWorkerModeSpace(
        createLiveKbnRequest({ kibanaUrl: String(flags.kibanaUrl), apiKey, username, password }),
        space
      );
      if (spaceCreated) {
        log.info(`Created space ${space}`);
      }
      const connectorId = await ensureWorkerModePrerequisites({
        esClient,
        kbnRequest,
        space,
        reasoningConnectorId: optionalString(flags.reasoningConnectorId),
      });
      log.info(`${FP_TP_INFERENCE_FEATURE_ID} → ${connectorId}`);

      let hostUser: WorkerModeHostUser | undefined;
      if (append) {
        hostUser = await readWorkerModeHostUser({ esClient, space });
        log.info(
          `Appending onto host ${hostUser.hostName} (${hostUser.hostId}) user ${hostUser.userName}`
        );
      } else {
        const cleaned = await cleanupWorkerModeSpace({ esClient, kbnRequest, space, serverless });
        log.info(
          `Removed ${cleaned.alerts} earlier seeded alert(s) and their events and entities on ${cleaned.hostIds.length} host(s)`
        );
      }

      const explicitManifest = optionalString(flags.manifest);
      let windowDeadline = '';
      for (let index = 0; index < sets; index++) {
        const plan = buildWorkerModePlan({
          space,
          exampleId: example.id,
          serverless,
          ...(hostUser === undefined ? {} : { hostUser }),
        });
        await seedWorkerModePlan({ esClient, kbnRequest, plan });
        if (hostUser === undefined) {
          hostUser = hostUserFromAlerts(plan.world.alerts);
        }
        const manifestPath = resolve(
          explicitManifest === undefined || sets > 1
            ? resolve(__dirname, '../target/ad_worker_fp_tp', `${space}-${plan.runMarker}.json`)
            : explicitManifest
        );
        await writeManifest(manifestPath, plan);
        windowDeadline = plan.windowDeadline;
        log.success(
          `Seeded set ${index + 1}/${sets} ${plan.exampleId} into space ${space} (expected ${
            plan.expectedOutcome
          })`
        );
        log.info(`Run marker: ${plan.runMarker}`);
        log.info(
          `Alerts: ${plan.alertIds.length}; events: ${plan.events.length}; entities: ${plan.entities.length}`
        );
        log.info(`Hosts: ${plan.hostIds.join(', ')}`);
        log.info(`Last alert at ${plan.lastAlertAt}`);
        log.info(`Manifest: ${manifestPath}`);
      }
      log.info(
        `Next: in space ${space}, enable the Attack Discovery Worker (AlertZero → Watches → Triage Watch) before ${windowDeadline}; enabling starts its first run. Later, the analysis's ±2h raw-event window misses the seeded events. The Worker reads every open alert in the space, so run it on one set before appending the next when the sets should become separate attacks.`
      );
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
      --sets writes several copies that share one host and user and keep distinct alert
      and event ids. Running the Worker and checking the result are manual steps.
    `,
    flags: {
      string: [
        'space',
        'outcome',
        'example',
        'sets',
        'kibanaUrl',
        'elasticsearchUrl',
        'username',
        'password',
        'apiKey',
        'reasoningConnectorId',
        'manifest',
      ],
      boolean: ['append', 'serverless'],
      default: {
        sets: '1',
        kibanaUrl: 'http://127.0.0.1:5601',
        elasticsearchUrl: 'http://127.0.0.1:9200',
        username: 'elastic',
        password: 'changeme',
      },
      help: `
        --space                 Dedicated Kibana space to seed (required; not "default").
                                Created if it does not exist
        --outcome               fp | tp | inconclusive: seeds that outcome's default example
        --example               Any example id with a non-failed gold, instead of --outcome
        --sets                  Copies of that example to seed (Default: 1, max 20). Each copy
                                has its own alert and event ids. Copies after the first reuse
                                the first copy's host and user
        --append                Keep the seed already in the space and add --sets copies onto
                                its host and user. Without this flag, earlier seeds are removed
        --kibanaUrl             Kibana URL (Default: http://127.0.0.1:5601)
        --elasticsearchUrl      Elasticsearch URL (Default: http://127.0.0.1:9200)
        --username              Basic auth username (Default: elastic)
        --password              Basic auth password (Default: changeme)
        --apiKey                ApiKey for Kibana and Elasticsearch; overrides Basic auth.
                                Prefer the ${API_KEY_ENV_VAR} env var, which is read when this
                                flag is absent and stays out of shell history
        --reasoningConnectorId  Connector to map alertzero_frontier to in the space
                                (Default: keep the existing mapping; one is required)
        --serverless            Serverless project seeding: raw events go to seeder-owned
                                logs-endpoint.events.fp-tp-<kind>-<space> data streams
                                (template + ingest pipeline installed by the script), and
                                cleanup stays inside them
        --manifest              Manifest path (Default: target/ad_worker_fp_tp/<space>-<marker>.json
                                in this package)
      `,
    },
  }
);
