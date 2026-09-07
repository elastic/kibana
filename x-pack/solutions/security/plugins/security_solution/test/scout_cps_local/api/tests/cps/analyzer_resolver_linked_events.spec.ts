/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { apiTest, PUBLIC_API_HEADERS, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { EsClient } from '@kbn/scout-security';

/**
 * Analyzer entity → tree against process events that live only in a linked project.
 *
 * Origin-only search must miss those documents. With platform CPS, resolver entity
 * lookup and tree queries use space project routing and should return the linked
 * parent plus its child.
 *
 * Requires:
 *   node scripts/scout start-server --arch serverless \
 *     --domain security_complete --serverConfigSet cps_local
 */

const PROCESS_INDEX_MAPPINGS = {
  properties: {
    '@timestamp': { type: 'date' },
    agent: {
      properties: {
        id: { type: 'keyword' },
        type: { type: 'keyword' },
      },
    },
    event: {
      properties: {
        category: { type: 'keyword' },
        kind: { type: 'keyword' },
        type: { type: 'keyword' },
        id: { type: 'keyword' },
      },
    },
    process: {
      properties: {
        entity_id: { type: 'keyword' },
        name: { type: 'keyword' },
        parent: {
          properties: {
            entity_id: { type: 'keyword' },
          },
        },
        Ext: {
          properties: {
            ancestry: { type: 'keyword' },
          },
        },
      },
    },
  },
} as const;

const PUBLIC_HEADERS = {
  'kbn-xsrf': 'security_solution',
  'Content-Type': 'application/json;charset=UTF-8',
  ...PUBLIC_API_HEADERS,
  'x-elastic-internal-origin': 'security_solution',
};

const ENDPOINT_SCHEMA = {
  id: 'process.entity_id',
  parent: 'process.parent.entity_id',
  ancestry: 'process.Ext.ancestry',
  name: 'process.name',
  agentId: 'agent.id',
};

interface ProcessEvent {
  '@timestamp': number;
  agent: { id: string; type: 'endpoint' };
  event: { category: string[]; kind: 'event'; type: string[]; id: string };
  process: {
    entity_id: string;
    name: string;
    parent?: { entity_id: string };
    Ext: { ancestry: string[] };
  };
}

interface ResolverEntity {
  name: string;
  id: string;
  schema: typeof ENDPOINT_SCHEMA;
  agentId?: string;
}

interface ResolverNode {
  id: string;
  parent?: string;
  name?: string;
}

const createProcessEvent = ({
  entityId,
  name,
  parentEntityId,
  ancestry = [],
}: {
  entityId: string;
  name: string;
  parentEntityId?: string;
  ancestry?: string[];
}): ProcessEvent => ({
  '@timestamp': Date.now(),
  agent: { id: `agent-${entityId}`, type: 'endpoint' },
  event: {
    category: ['process'],
    kind: 'event',
    type: ['start'],
    id: randomUUID(),
  },
  process: {
    entity_id: entityId,
    name,
    ...(parentEntityId ? { parent: { entity_id: parentEntityId } } : {}),
    Ext: { ancestry },
  },
});

const seedLinkedProcessIndex = async (
  esClient: EsClient,
  index: string,
  events: ProcessEvent[]
): Promise<string[]> => {
  await esClient.indices.create({ index, mappings: PROCESS_INDEX_MAPPINGS });
  const bulk = await esClient.bulk({
    refresh: 'wait_for',
    operations: events.flatMap((event) => [{ create: { _index: index } }, event]),
  });

  if (bulk.errors) {
    const errors = bulk.items
      .filter((item) => item.create?.error)
      .map((item) => item.create?.error);
    throw new Error(`Bulk indexing had errors: ${JSON.stringify(errors)}`);
  }

  return events.map((_, i) => {
    const id = bulk.items[i].create?._id;
    if (!id) {
      throw new Error(`Bulk create did not return an id for event ${i}`);
    }
    return id;
  });
};

apiTest.describe(
  'Analyzer resolver entity to tree for linked-cluster events',
  { tag: tags.serverless.security.complete },
  () => {
    const runId = randomUUID().slice(0, 8);
    const index = `scout-cps-analyzer-${runId}`;
    const parentEntityId = `parent-${runId}`;
    const childEntityId = `child-${runId}`;
    const parentEvent = createProcessEvent({
      entityId: parentEntityId,
      name: 'parent.exe',
    });
    const childEvent = createProcessEvent({
      entityId: childEntityId,
      name: 'child.exe',
      parentEntityId,
      ancestry: [parentEntityId],
    });

    let headers: Record<string, string>;
    let parentDocId: string;

    apiTest.beforeAll(async ({ samlAuth, linkedProject }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      headers = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };

      const ids = await seedLinkedProcessIndex(linkedProject.esClient, index, [
        parentEvent,
        childEvent,
      ]);
      parentDocId = ids[0];
    });

    apiTest.afterAll(async ({ linkedProject }) => {
      await linkedProject.esClient.indices.delete({ index }, { ignore: [404] });
    });

    apiTest(
      'entity lookup finds a linked-cluster process and tree returns parent and child',
      async ({ apiClient, esClient }) => {
        const originHits = await esClient.search({
          index,
          ignore_unavailable: true,
          query: { ids: { values: [parentDocId] } },
        });
        expect(
          originHits.hits.hits,
          'origin cluster must not contain the linked process document'
        ).toHaveLength(0);

        const entityResponse = await apiClient.get(
          `/api/endpoint/resolver/entity?_id=${encodeURIComponent(
            parentDocId
          )}&indices=${encodeURIComponent(index)}`,
          { headers, responseType: 'json' }
        );
        expect(entityResponse).toHaveStatusCode(200);

        const entities = entityResponse.body as ResolverEntity[];
        expect(entities).toHaveLength(1);
        expect(entities[0]).toMatchObject({
          name: 'endpoint',
          id: parentEntityId,
          schema: { id: 'process.entity_id' },
        });

        const treeResponse = await apiClient.post('/api/endpoint/resolver/tree', {
          headers,
          responseType: 'json',
          body: {
            descendants: 100,
            descendantLevels: 20,
            ancestors: 1,
            schema: ENDPOINT_SCHEMA,
            nodes: [parentEntityId],
            indexPatterns: [index],
            timeRange: {
              from: new Date(parentEvent['@timestamp'] - 60_000).toISOString(),
              to: new Date(childEvent['@timestamp'] + 60_000).toISOString(),
            },
          },
        });
        expect(treeResponse).toHaveStatusCode(200);

        const nodes = treeResponse.body as ResolverNode[];
        const nodeIds = nodes.map((node) => node.id);
        expect(nodeIds).toContain(parentEntityId);
        expect(nodeIds).toContain(childEntityId);
      }
    );
  }
);
