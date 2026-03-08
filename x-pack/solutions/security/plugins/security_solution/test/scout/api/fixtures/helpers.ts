/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import { ELASTIC_DEFEND_INDEX, ELASTIC_DEFEND_TEMPLATE } from './constants';

interface AccessPair {
  userId: string;
  userName: string;
  hostId: string;
  hostName: string;
  hostIp: string;
  count: number;
  expectedRelationship: 'accesses_frequently' | 'accesses_infrequently';
}

/**
 * 6 users, mixed host counts = 16,000 documents.
 * access_count > 4 → accesses_frequently, otherwise accesses_infrequently.
 */
export const ACCESS_PAIRS: AccessPair[] = [
  // user-001: host-001 x1996 (freq), host-002 x4 (infreq) = 2000
  {
    userId: 'test-user-001',
    userName: 'test-user-001',
    hostId: 'test-host-001',
    hostName: 'test-host-001',
    hostIp: '10.0.0.1',
    count: 1996,
    expectedRelationship: 'accesses_frequently',
  },
  {
    userId: 'test-user-001',
    userName: 'test-user-001',
    hostId: 'test-host-002',
    hostName: 'test-host-002',
    hostIp: '10.0.0.2',
    count: 4,
    expectedRelationship: 'accesses_infrequently',
  },
  // user-002: host-003 x1996 (freq), host-004 x4 (infreq) = 2000
  {
    userId: 'test-user-002',
    userName: 'test-user-002',
    hostId: 'test-host-003',
    hostName: 'test-host-003',
    hostIp: '10.0.0.3',
    count: 1996,
    expectedRelationship: 'accesses_frequently',
  },
  {
    userId: 'test-user-002',
    userName: 'test-user-002',
    hostId: 'test-host-004',
    hostName: 'test-host-004',
    hostIp: '10.0.0.4',
    count: 4,
    expectedRelationship: 'accesses_infrequently',
  },
  // user-003: host-001 x1000 (freq), host-005 x1000 (freq) = 2000
  {
    userId: 'test-user-003',
    userName: 'test-user-003',
    hostId: 'test-host-001',
    hostName: 'test-host-001',
    hostIp: '10.0.0.1',
    count: 1000,
    expectedRelationship: 'accesses_frequently',
  },
  {
    userId: 'test-user-003',
    userName: 'test-user-003',
    hostId: 'test-host-005',
    hostName: 'test-host-005',
    hostIp: '10.0.0.5',
    count: 1000,
    expectedRelationship: 'accesses_frequently',
  },
  // user-004: host-003 x1997 (freq), host-002 x3 (infreq) = 2000
  {
    userId: 'test-user-004',
    userName: 'test-user-004',
    hostId: 'test-host-003',
    hostName: 'test-host-003',
    hostIp: '10.0.0.3',
    count: 1997,
    expectedRelationship: 'accesses_frequently',
  },
  {
    userId: 'test-user-004',
    userName: 'test-user-004',
    hostId: 'test-host-002',
    hostName: 'test-host-002',
    hostIp: '10.0.0.2',
    count: 3,
    expectedRelationship: 'accesses_infrequently',
  },
  // user-005: host-005 x1998 (freq), host-004 x2 (infreq) = 2000
  {
    userId: 'test-user-005',
    userName: 'test-user-005',
    hostId: 'test-host-005',
    hostName: 'test-host-005',
    hostIp: '10.0.0.5',
    count: 1998,
    expectedRelationship: 'accesses_frequently',
  },
  {
    userId: 'test-user-005',
    userName: 'test-user-005',
    hostId: 'test-host-004',
    hostName: 'test-host-004',
    hostIp: '10.0.0.4',
    count: 2,
    expectedRelationship: 'accesses_infrequently',
  },
  // user-006: host-006 x1998 (freq), host-007 x1998 (freq), host-008 x1998 (freq),
  //           host-009 x2 (infreq), host-010 x2 (infreq), host-011 x2 (infreq) = 6000
  {
    userId: 'test-user-006',
    userName: 'test-user-006',
    hostId: 'test-host-006',
    hostName: 'test-host-006',
    hostIp: '10.0.0.6',
    count: 1998,
    expectedRelationship: 'accesses_frequently',
  },
  {
    userId: 'test-user-006',
    userName: 'test-user-006',
    hostId: 'test-host-007',
    hostName: 'test-host-007',
    hostIp: '10.0.0.7',
    count: 1998,
    expectedRelationship: 'accesses_frequently',
  },
  {
    userId: 'test-user-006',
    userName: 'test-user-006',
    hostId: 'test-host-008',
    hostName: 'test-host-008',
    hostIp: '10.0.0.8',
    count: 1998,
    expectedRelationship: 'accesses_frequently',
  },
  {
    userId: 'test-user-006',
    userName: 'test-user-006',
    hostId: 'test-host-009',
    hostName: 'test-host-009',
    hostIp: '10.0.0.9',
    count: 2,
    expectedRelationship: 'accesses_infrequently',
  },
  {
    userId: 'test-user-006',
    userName: 'test-user-006',
    hostId: 'test-host-010',
    hostName: 'test-host-010',
    hostIp: '10.0.0.10',
    count: 2,
    expectedRelationship: 'accesses_infrequently',
  },
  {
    userId: 'test-user-006',
    userName: 'test-user-006',
    hostId: 'test-host-011',
    hostName: 'test-host-011',
    hostIp: '10.0.0.11',
    count: 2,
    expectedRelationship: 'accesses_infrequently',
  },
];

function generateElasticDefendEvent(pair: AccessPair, index: number): Record<string, unknown> {
  const now = new Date();
  const timestamp = new Date(now.getTime() - index * 1000).toISOString();

  return {
    '@timestamp': timestamp,
    agent: {
      id: 'scout-test-agent-001',
      type: 'endpoint',
      version: '8.17.4',
    },
    data_stream: {
      dataset: 'endpoint.events.security',
      namespace: 'default',
      type: 'logs',
    },
    ecs: { version: '1.11.0' },
    event: {
      action: 'log_on',
      agent_id_status: 'auth_metadata_missing',
      category: ['authentication', 'session'],
      created: timestamp,
      dataset: 'endpoint.events.security',
      id: `scout-event-${pair.userId}-${pair.hostId}-${index}`,
      kind: 'event',
      module: 'endpoint',
      outcome: 'success',
      type: ['start'],
    },
    host: {
      architecture: 'x86_64',
      hostname: pair.hostName,
      id: pair.hostId,
      ip: [pair.hostIp, '127.0.0.1', '::1'],
      mac: ['00-00-00-00-00-01'],
      name: pair.hostName,
      os: {
        family: 'windows',
        full: 'Windows 11 Pro 10.0.22631',
        name: 'Windows',
        platform: 'windows',
        type: 'windows',
        version: '10.0.22631',
      },
    },
    message: 'Endpoint security event',
    process: {
      Ext: {
        ancestry: ['scout-test-ancestry'],
        session_info: {
          authentication_package: 'Negotiate',
          logon_type: 'RemoteInteractive',
        },
      },
      executable: 'C:\\Windows\\System32\\svchost.exe',
      name: 'svchost.exe',
      pid: 1000 + index,
    },
    user: {
      id: pair.userId,
      name: pair.userName,
      domain: 'SCOUT-TEST',
    },
  };
}

const BULK_CHUNK_SIZE = 2000;

export async function bulkIngestEvents(esClient: EsClient): Promise<number> {
  const allDocs: Record<string, unknown>[] = [];

  let globalIndex = 0;
  for (const pair of ACCESS_PAIRS) {
    for (let i = 0; i < pair.count; i++) {
      allDocs.push(generateElasticDefendEvent(pair, globalIndex));
      globalIndex++;
    }
  }

  for (let offset = 0; offset < allDocs.length; offset += BULK_CHUNK_SIZE) {
    const chunk = allDocs.slice(offset, offset + BULK_CHUNK_SIZE);
    const operations = chunk.flatMap((doc) => [{ create: { _index: ELASTIC_DEFEND_INDEX } }, doc]);

    const result = await esClient.bulk({
      operations,
      refresh: offset + BULK_CHUNK_SIZE >= allDocs.length ? 'wait_for' : false,
    });

    if (result.errors) {
      const errorItems = result.items.filter((item) => item.create?.error);
      throw new Error(
        `Bulk ingest failed for ${errorItems.length} docs: ${JSON.stringify(
          errorItems.slice(0, 3)
        )}`
      );
    }
  }

  return allDocs.length;
}

export async function ensureDataStream(esClient: EsClient): Promise<void> {
  await cleanupDataStream(esClient);

  await esClient.indices.putIndexTemplate({
    name: ELASTIC_DEFEND_TEMPLATE,
    index_patterns: ['logs-endpoint.events.security-*'],
    data_stream: {},
    priority: 500,
    template: {
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          event: {
            properties: {
              action: { type: 'keyword' },
              outcome: { type: 'keyword' },
              category: { type: 'keyword' },
              kind: { type: 'keyword' },
              module: { type: 'keyword' },
              type: { type: 'keyword' },
              dataset: { type: 'keyword' },
              id: { type: 'keyword' },
              agent_id_status: { type: 'keyword' },
              created: { type: 'date' },
            },
          },
          host: {
            properties: {
              id: { type: 'keyword' },
              name: { type: 'keyword' },
              hostname: { type: 'keyword' },
              domain: { type: 'keyword' },
              ip: { type: 'ip' },
              mac: { type: 'keyword' },
              architecture: { type: 'keyword' },
              os: {
                properties: {
                  family: { type: 'keyword' },
                  full: { type: 'keyword' },
                  name: { type: 'keyword' },
                  platform: { type: 'keyword' },
                  type: { type: 'keyword' },
                  version: { type: 'keyword' },
                },
              },
            },
          },
          user: {
            properties: {
              id: { type: 'keyword' },
              name: { type: 'keyword' },
              email: { type: 'keyword' },
              domain: { type: 'keyword' },
            },
          },
          process: {
            properties: {
              Ext: {
                properties: {
                  ancestry: { type: 'keyword' },
                  session_info: {
                    properties: {
                      authentication_package: { type: 'keyword' },
                      logon_type: { type: 'keyword' },
                    },
                  },
                },
              },
              executable: { type: 'keyword' },
              name: { type: 'keyword' },
              pid: { type: 'long' },
            },
          },
          agent: {
            properties: {
              id: { type: 'keyword' },
              type: { type: 'keyword' },
              version: { type: 'keyword' },
            },
          },
          data_stream: {
            properties: {
              dataset: { type: 'keyword' },
              namespace: { type: 'keyword' },
              type: { type: 'keyword' },
            },
          },
          message: { type: 'text' },
        },
      },
    },
  });

  await esClient.indices.createDataStream({ name: ELASTIC_DEFEND_INDEX });
}

export async function cleanupDataStream(esClient: EsClient): Promise<void> {
  await esClient.indices.deleteDataStream({ name: ELASTIC_DEFEND_INDEX }).catch(() => {});

  await esClient.indices.deleteIndexTemplate({ name: ELASTIC_DEFEND_TEMPLATE }).catch(() => {});
}

/**
 * Builds the expected relationship map from ACCESS_PAIRS.
 *
 * Without *.entity.id fields in Elastic Defend data, the user EUID resolves
 * to `user.name@host.id`, so each user-host pair becomes a separate entity.
 * Entity IDs in the latest index include the `user:` type prefix.
 *
 * Returns a map of entityId → { accesses_frequently: hostId[], accesses_infrequently: hostId[] }
 */
export function getExpectedRelationships(): Map<
  string,
  { accesses_frequently: string[]; accesses_infrequently: string[] }
> {
  const result = new Map<
    string,
    { accesses_frequently: string[]; accesses_infrequently: string[] }
  >();

  for (const pair of ACCESS_PAIRS) {
    const entityId = `user:${pair.userName}@${pair.hostId}`;
    const entry: { accesses_frequently: string[]; accesses_infrequently: string[] } = {
      accesses_frequently: [],
      accesses_infrequently: [],
    };
    entry[pair.expectedRelationship].push(pair.hostId);
    result.set(entityId, entry);
  }

  return result;
}
