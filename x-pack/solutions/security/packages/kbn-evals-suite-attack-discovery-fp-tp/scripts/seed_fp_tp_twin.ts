/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import { getFpTpScenario } from '../src/scenarios';
import { FP_TP_TWIN_SEED_LABEL, joinKibanaUrl, seedTwinLive } from '../src/world';
import type { FpTpLiveKbnRequest } from '../src/world';

const createKbnRequest = ({
  kibanaUrl,
  username,
  password,
}: {
  kibanaUrl: string;
  username: string;
  password: string;
}): FpTpLiveKbnRequest => {
  const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

  return async ({ method, path, body, version }) => {
    const headers: Record<string, string> = {
      Authorization: authorization,
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'kibana',
      'Content-Type': 'application/json',
    };
    if (version !== undefined) {
      headers['elastic-api-version'] = version;
    }

    const response = await fetch(joinKibanaUrl(kibanaUrl, path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = text.length > 0 ? JSON.parse(text) : undefined;
    } catch {
      parsed = text;
    }
    return { statusCode: response.status, body: parsed };
  };
};

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
    const username = flags.username as string;
    const password = flags.password as string;

    const esClient = new Client({
      node: elasticsearchUrl,
      auth: { username, password },
    });

    try {
      const kbnRequest = createKbnRequest({ kibanaUrl, username, password });
      const summary = await seedTwinLive({
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
      'Seeds one FP/TP scenario twin into a local Elasticsearch + Kibana for Workflows UI validation.',
    flags: {
      string: ['scenario', 'variant', 'kibanaUrl', 'elasticsearchUrl', 'username', 'password'],
      default: {
        scenario: 'encoded-powershell',
        variant: 'fp',
        kibanaUrl: 'http://127.0.0.1:5601',
        elasticsearchUrl: 'http://127.0.0.1:9200',
        username: 'elastic',
        password: 'changeme',
      },
      help: `
        --scenario                      Scenario key (Default: encoded-powershell)
        --variant                       Twin of the scenario to load, e.g. tp or fp (Default: fp). Only one at a time.
        --kibanaUrl                     Kibana URL (Default: http://127.0.0.1:5601)
        --elasticsearchUrl              Elasticsearch URL (Default: http://127.0.0.1:9200)
        --username                      Username (Default: elastic)
        --password                      Password (Default: changeme)
      `,
    },
  }
);
