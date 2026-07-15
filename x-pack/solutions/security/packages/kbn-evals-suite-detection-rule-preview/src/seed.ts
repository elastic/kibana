/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';

const PREVIEW_ALERTS_INDEX = '.internal.preview.alerts-security.alerts-default-000001';
const SEED_INDEX = 'logs-endpoint.events.process-default';

export const seedRulePreviewAlerts = async (esClient: EsClient, count = 8): Promise<void> => {
  const now = Date.now();
  const operations: Array<Record<string, unknown>> = [];

  for (let i = 0; i < count; i++) {
    const ts = new Date(now - i * 5 * 60_000).toISOString();
    const host = `finance-ws-${String(i).padStart(2, '0')}`;
    operations.push({ create: { _index: SEED_INDEX } });
    operations.push({
      '@timestamp': ts,
      event: {
        action: 'exec',
        category: ['process'],
        dataset: 'endpoint.events.process',
        kind: 'event',
        module: 'endpoint',
        outcome: 'failure',
        type: ['start'],
      },
      host: { name: host, hostname: host },
      user: { name: `user${i}` },
      process: {
        name: i % 2 === 0 ? 'cmd.exe' : 'powershell.exe',
        executable: 'C:\\Windows\\System32\\cmd.exe',
        command_line: `failed-process-${i}`,
        pid: 1000 + i,
      },
      agent: { type: 'endpoint', id: `agent-preview-seed-${i}` },
      data_stream: {
        type: 'logs',
        dataset: 'endpoint.events.process',
        namespace: 'default',
      },
      ecs: { version: '8.11.0' },
      message: `Seeded failure process event ${i} for rule preview validation`,
    });
  }

  const bulkResponse = await esClient.bulk({ refresh: 'wait_for', operations });
  if (bulkResponse.errors) {
    throw new Error('Failed to seed rule preview alerts');
  }
};

export const countPreviewAlerts = async (
  esClient: EsClient,
  previewId: string
): Promise<number> => {
  const result = await esClient.count({
    index: PREVIEW_ALERTS_INDEX,
    query: { term: { 'kibana.alert.rule.uuid': previewId } },
  });
  return result.count ?? 0;
};
