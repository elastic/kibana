/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import { ALERT_EVENTS_MAPPINGS } from '@kbn/alerting-v2-schemas';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import { ManagedRuleReader } from '../managed_rule_reader';

const MINUTE_MS = 60_000;
const WINDOW_START = Date.UTC(2026, 10, 13, 10, 0);

function createRow({
  ruleId,
  minute,
  data,
  spaceId = 'default',
  type = 'signal',
}: {
  ruleId: string;
  /** Minutes after the window start the row was indexed at. */
  minute: number;
  data: Record<string, unknown>;
  spaceId?: string;
  type?: string;
}) {
  const timestamp = new Date(WINDOW_START + minute * MINUTE_MS).toISOString();
  return {
    '@timestamp': timestamp,
    scheduled_timestamp: timestamp,
    type,
    space_id: spaceId,
    rule: { id: ruleId, version: 1 },
    source: 'internal',
    data,
  };
}

// Runs as the test cluster's superuser against the real `.rule-events` mapping, where `data` is
// `flattened` and ES|QL can only hand it back through `_source`.
describe('ManagedRuleReader.readRows from .rule-events', () => {
  jest.setTimeout(10 * 60 * 1000);

  let esServer: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;
  let reader: ManagedRuleReader;

  beforeAll(async () => {
    const { startES } = createTestServers({ adjustTimeout: jest.setTimeout });
    esServer = await startES();
    esClient = esServer.es.getClient();
    await esClient.indices.putIndexTemplate({
      name: ALERT_EVENTS_DATA_STREAM,
      index_patterns: [ALERT_EVENTS_DATA_STREAM],
      data_stream: { hidden: true },
      template: { mappings: ALERT_EVENTS_MAPPINGS },
    });
    await esClient.indices.createDataStream({ name: ALERT_EVENTS_DATA_STREAM });
    reader = new ManagedRuleReader({} as Pick<RulesClientApi, 'findRules'>, esClient);
  });

  afterAll(async () => {
    // Teardown only: a failure to stop must not hide the test result.
    await esServer?.stop().catch(() => {});
  });

  it('reads the signal rows of the given rules in the space and window, newest first, data whole', async () => {
    const rows = [
      createRow({ ruleId: 'rule-a', minute: 0, data: { 'service.name': 'cart', count: 3 } }),
      createRow({ ruleId: 'rule-b', minute: 1, data: { nested: { error: 'timeout' } } }),
      // Indexed at the end of the window, so it is out: the window is [from, to).
      createRow({ ruleId: 'rule-a', minute: 2, data: { count: 9 } }),
      createRow({ ruleId: 'rule-a', minute: -1, data: { count: 8 } }),
      createRow({ ruleId: 'rule-other', minute: 0, data: { count: 7 } }),
      createRow({ ruleId: 'rule-a', minute: 0, data: { count: 6 }, spaceId: 'other' }),
      createRow({ ruleId: 'rule-a', minute: 0, data: { count: 5 }, type: 'alert' }),
    ];
    await esClient.bulk({
      operations: rows.flatMap((row) => [{ create: { _index: ALERT_EVENTS_DATA_STREAM } }, row]),
      refresh: true,
    });

    const result = await reader.readRows({
      spaceId: 'default',
      ruleIds: ['rule-a', 'rule-b'],
      from: WINDOW_START,
      to: WINDOW_START + 2 * MINUTE_MS,
    });

    expect(result).toEqual([
      {
        rule_id: 'rule-b',
        scheduled_timestamp: WINDOW_START + MINUTE_MS,
        data: { nested: { error: 'timeout' } },
      },
      {
        rule_id: 'rule-a',
        scheduled_timestamp: WINDOW_START,
        data: { 'service.name': 'cart', count: 3 },
      },
    ]);
  });
});
