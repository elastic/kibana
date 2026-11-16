/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { Client } from '@elastic/elasticsearch';
import { CLAIMS_APP } from '@kbn/synthtrace/src/scenarios/sigevents/mock_apps/claims';
import { getConnectionConfig } from './seed_sigevents_env/lib/get_connection_config';
import { SEED_SOURCE_TITLE, ensureSeedSource } from './seed_sigevents_env/lib/seed_source';
import { CLAIMS_SEED } from './seed_sigevents_env/scenarios/claims';
import {
  seedAlerts,
  seedFeatures,
  seedLogs,
  seedQueries,
  cleanSeedData,
  runDiscovery,
  verifyChangePoint,
} from './seed_sigevents_env/steps';
import type { SeedBaseContext, SeedContext } from './seed_sigevents_env/types';
import { getSynthtraceDefaultStream } from './seed_sigevents_env/types';

/** Fixed RNG seed — changing this invalidates all deterministic IDs (alerts, features) across re-runs. */
const FIXED_SEED = 42;

run(
  async ({ log, flags }) => {
    const config = await getConnectionConfig(flags, log);

    const scenarioName = String(flags.scenario || 'fraud_check_redis_herring');
    const streamName = getSynthtraceDefaultStream();
    const space = String(flags.space || 'default');

    // Validate CLAIMS_SEED ↔ CLAIMS_APP.scenarios alignment — catches drift at startup.
    for (const key of Object.keys(CLAIMS_SEED)) {
      if (!(key in CLAIMS_APP.scenarios)) {
        throw new Error(
          `CLAIMS_SEED defines scenario "${key}" which is absent from CLAIMS_APP.scenarios — ` +
            `update CLAIMS_SEED to match CLAIMS_APP. Valid keys: ${Object.keys(
              CLAIMS_APP.scenarios
            ).join(', ')}`
        );
      }
    }

    const scenario = CLAIMS_SEED[scenarioName];
    if (!scenario) {
      const available = Object.keys(CLAIMS_SEED).sort().join(', ');
      throw new Error(`Unknown scenario "${scenarioName}". Available: ${available}`);
    }

    const baseCtx: SeedBaseContext = {
      esUrl: config.esUrl,
      kibanaUrl: config.kibanaUrl,
      username: config.username,
      password: config.password,
      streamName,
      scenarioName,
      seed: FIXED_SEED,
      space,
      generatedAt: new Date().toISOString(),
    };

    const esClient = new Client({
      node: config.esUrl,
      auth: { username: config.username, password: config.password },
    });

    if (flags.clean === true) {
      log.info('Running clean before seeding…');
      await cleanSeedData(baseCtx, esClient, config, log);
    }

    // Step ordering matters — dependencies:
    //   logs       → must exist before the source (creating a source executes its query)
    //   source     → must exist before features and queries (both are keyed by its id)
    //   queries    → must be promoted before rule_ids can be read (needed by alerts)

    log.info('Seeding logs…');
    const { seriesStartMs, seriesEndMs, manifest } = await seedLogs(baseCtx, esClient, log);

    log.info('Ensuring seed source…');
    const source = await ensureSeedSource(config, space, streamName, log);
    const ctx: SeedContext = { ...baseCtx, sourceId: source.id, viewName: source.view_name };

    log.info('Seeding features…');
    await seedFeatures(ctx, manifest, config, log);

    log.info('Seeding queries…');

    const seededQueries = await seedQueries(ctx, scenario, config, log);

    log.info('Seeding alerts…');
    const seededSeries = await seedAlerts(
      ctx,
      seededQueries,
      seriesStartMs,
      seriesEndMs,
      esClient,
      log
    );

    log.info('Verifying change-point detection…');
    await verifyChangePoint(seededQueries, seededSeries, config, space, log);

    if (flags['run-discovery'] === true) {
      log.info('Running significant-events discovery…');
      await runDiscovery(ctx, seededQueries, esClient, config, log);
    }

    log.info('Done.');
  },
  {
    description: 'Synthetic sigevents seed for local Kibana + Elasticsearch.',
    flags: {
      string: ['scenario', 'space', 'es-url', 'es-username', 'es-password', 'kibana-url'],
      boolean: ['clean', 'run-discovery'],
      help: `
        --scenario <name>        Scenario key in CLAIMS_SEED (default: fraud_check_redis_herring)
                                 Available: fraud_check_redis_herring, healthy_baseline
        --space <name>           Kibana space for seeded assets (default: default)
        --clean                  Delete all previously seeded data (the seed source with its features
                                 and queries, alerts, and the data stream) before re-seeding
        --run-discovery          Run detection, seed post-detection evidence, then run AI discovery
                                 and verify an active event (requires a configured inference connector)
        --es-url <url>           Elasticsearch URL (default: from kibana.dev.yml)
        --es-username <user>     ES username (default: elastic)
        --es-password <pass>     ES password (default: changeme)
        --kibana-url <url>       Kibana base URL (default: from kibana.dev.yml, auto-detects dev base path)

        Notes:
          A Nightshift source titled "${SEED_SOURCE_TITLE}" is created over the data stream
          once the logs are seeded, and reused on later runs.
      `,
    },
  }
);
