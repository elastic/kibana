/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import { getFpTpScenario } from '../src/scenarios';
import {
  assertClassicSpace,
  assertServerlessSpace,
  createLiveKbnRequest,
  FP_TP_TWIN_SEED_LABEL,
  seedTwinLive,
  seedTwinLiveServerless,
  toRunMarker,
} from '../src/world';
import type { FpTpLiveKbnRequest } from '../src/world';

run(
  async ({ flags, log }) => {
    const scenario = getFpTpScenario(String(flags.scenario));
    const variant = String(flags.variant);
    const buildTwin = scenario.twins[variant];
    if (!buildTwin) {
      throw new Error(
        `--variant must be one of ${Object.keys(scenario.twins).join(', ')} for ${scenario.key}`
      );
    }

    const kibanaUrl = flags.kibanaUrl as string;
    const elasticsearchUrl = flags.elasticsearchUrl as string;
    const apiKey = flags.apiKey as string | undefined;
    const username = flags.username as string | undefined;
    const password = flags.password as string | undefined;
    const space = flags.space as string;
    const serverless = Boolean(flags.serverless);
    const reasoningConnectorId = flags.reasoningConnectorId as string | undefined;

    if (serverless && reasoningConnectorId === undefined) {
      throw new Error(
        '--serverless needs --reasoningConnectorId: the connector the space maps the ' +
          'alertzero_frontier inference feature to (and the validate workflow bookkeeps).'
      );
    }
    if (serverless) {
      assertServerlessSpace(space);
    } else {
      assertClassicSpace(space);
    }

    const esClient = new Client({
      node: elasticsearchUrl,
      auth:
        apiKey !== undefined && apiKey.length > 0
          ? { apiKey }
          : { username: String(username), password: String(password) },
    });

    try {
      const kbnRequest: FpTpLiveKbnRequest = createLiveKbnRequest({
        kibanaUrl,
        apiKey,
        username,
        password,
        space,
      });

      const summary = serverless
        ? (
            await seedTwinLiveServerless({
              esClient,
              kbnRequest,
              // A per-space marker gives every space its own host ids: the
              // analysis reads raw events by host.id across all namespaces.
              twin: buildTwin(toRunMarker(space)),
              space,
              reasoningConnectorId: reasoningConnectorId as string,
            })
          ).summary
        : await seedTwinLive({
            esClient,
            kbnRequest,
            twin: buildTwin(FP_TP_TWIN_SEED_LABEL),
          });

      log.success(`Seeded ${summary.twinId}`);
      log.info(`Attack Discovery id: ${summary.attackId}`);
      log.info(`Attack Discovery index: ${summary.attackIndex}`);
      log.info(`Alerts: ${summary.alertCount}; events: ${summary.eventCount}`);
      log.info(`Entities: ${summary.entityIds.join(', ')}`);
      log.info(`Gold: ${summary.gold.classification} — ${summary.gold.why}`);
    } finally {
      await esClient.close();
    }
  },
  {
    description:
      'Seeds one FP/TP scenario twin into Elasticsearch + Kibana for Workflows UI validation. ' +
      'Default is the classic-stack path (Basic auth, default space). --serverless seeds into a ' +
      'Kibana space with an ApiKey: product-managed data streams are bootstrapped through their ' +
      'APIs, raw events go to a seeder-owned logs-endpoint.events namespace, and the Attack ' +
      'Discovery is persisted by the managed system-attack-discovery-validate workflow.',
    flags: {
      string: [
        'scenario',
        'variant',
        'kibanaUrl',
        'elasticsearchUrl',
        'username',
        'password',
        'apiKey',
        'space',
        'reasoningConnectorId',
      ],
      boolean: ['serverless'],
      default: {
        scenario: 'encoded-powershell',
        variant: 'fp',
        kibanaUrl: 'http://127.0.0.1:5601',
        elasticsearchUrl: 'http://127.0.0.1:9200',
        username: 'elastic',
        password: 'changeme',
        space: 'default',
      },
      help: `
        --scenario                      Scenario key (Default: encoded-powershell)
        --variant                       Twin variant of the scenario (Default: fp)
        --kibanaUrl                     Kibana base URL (Default: http://127.0.0.1:5601)
        --elasticsearchUrl              Elasticsearch base URL (Default: http://127.0.0.1:9200)
        --username                      Kibana/ES username for Basic auth (Default: elastic)
        --password                      Kibana/ES password for Basic auth (Default: changeme)
        --apiKey                        ApiKey for Kibana and ES auth; overrides Basic auth
        --space                         Kibana space to seed into (Default: default; only
                                        with --serverless, which requires a dedicated
                                        non-default space)
        --serverless                    Space-scoped serverless seeding: detection-engine
                                        bootstrap + no-match rule, Entity Store CRUD,
                                        seeder-owned event namespace, managed validate run
        --reasoningConnectorId          Connector id mapped to the alertzero_frontier
                                        inference feature in the space (required with
                                        --serverless)
      `,
    },
  }
);
