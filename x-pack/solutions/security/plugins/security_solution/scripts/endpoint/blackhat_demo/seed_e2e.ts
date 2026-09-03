/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';

import { seedForensicTimeline } from './forensic_seed_data';

const ES_URL = process.env.ES_URL ?? 'http://localhost:9241';
const ES_USER = process.env.ES_USER ?? 'elastic';
const ES_PASS = process.env.ES_PASS ?? 'changeme';

export async function run() {
  const log = new ToolingLog({ level: 'info', writeTo: process.stdout });
  const esClient = new Client({
    node: ES_URL,
    auth: { username: ES_USER, password: ES_PASS },
  });

  await seedForensicTimeline({ esClient }, log);
  await esClient.indices.refresh({ index: 'logs-endpoint.events.*' });

  const count = await esClient.count({ index: 'logs-endpoint.events.*' });
  log.info(`SEEDED_DOC_COUNT=${count.count}`);
}
