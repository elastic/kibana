/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';

import { actsOnBehalfOfMaintainer } from '.';

type Ctx = Parameters<typeof actsOnBehalfOfMaintainer.run>[0];

const AGENT_ID = 'ai_agent:claude_code@host-1@ec2-user';
const OKTA_USER_ID = 'user:alice@example.com@okta';

/**
 * Stands in for Elasticsearch: one page of agent actors, the ES|QL rows the lookup returns, and
 * the target existence check against the entity index.
 */
const makeEsClient = ({
  esqlRows,
  existingIds,
}: {
  esqlRows: Array<[string, string | string[]]>;
  existingIds: string[];
}) => {
  const search = jest.fn().mockImplementation(async (params: { aggs?: unknown; query?: unknown }) => {
    if (params.aggs) {
      return search.mock.calls.length === 1
        ? {
            aggregations: {
              users: {
                buckets: esqlRows.map(([actor]) => ({ key: { 'entity.id': actor }, doc_count: 1 })),
                after_key: { 'entity.id': 'last' },
              },
            },
          }
        : { aggregations: { users: { buckets: [] } } };
    }
    const requested = (params.query as { terms: { 'entity.id': string[] } }).terms['entity.id'];
    return {
      hits: {
        hits: requested
          .filter((id) => existingIds.includes(id))
          .map((id) => ({ fields: { 'entity.id': [id] } })),
      },
    };
  });
  const esql = jest.fn().mockResolvedValue({
    columns: [
      { name: 'acts_on_behalf_of', type: 'keyword' },
      { name: 'actorUserId', type: 'keyword' },
    ],
    values: esqlRows.map(([actor, targets]) => [targets, actor]),
  });
  return { search, esql, esClient: { search, esql: { query: esql } } as unknown as ElasticsearchClient };
};

const makeContext = (esClient: ElasticsearchClient) => {
  const bulkUpdateEntity = jest.fn().mockResolvedValue([]);
  const ctx = {
    status: {
      metadata: { namespace: 'default', runs: 0, lastSuccessTimestamp: null, lastErrorTimestamp: null },
      state: {},
      taskStatus: 'started',
    },
    abortController: new AbortController(),
    logger: loggerMock.create(),
    fakeRequest: {} as KibanaRequest,
    esClient,
    crudClient: { bulkUpdateEntity },
    entityMetadataClient: {
      bulkAppendMetadata: jest
        .fn()
        .mockImplementation(async (docs: unknown[]) => ({ successful: docs.length, failed: 0 })),
    },
    relationshipsClient: { clearRelationshipIds: jest.fn() },
    telemetry: { report: jest.fn() },
  } as unknown as Ctx;
  return { ctx, bulkUpdateEntity };
};

describe('actsOnBehalfOfMaintainer', () => {
  it('writes the resolved user IDs onto the agent row', async () => {
    const { esClient } = makeEsClient({
      esqlRows: [[AGENT_ID, OKTA_USER_ID]],
      existingIds: [OKTA_USER_ID],
    });
    const { ctx, bulkUpdateEntity } = makeContext(esClient);

    await actsOnBehalfOfMaintainer.run(ctx);

    expect(bulkUpdateEntity).toHaveBeenCalledWith({
      force: true,
      objects: [
        {
          type: 'ai_agent',
          doc: {
            entity: { id: AGENT_ID, relationships: { acts_on_behalf_of: { ids: [OKTA_USER_ID] } } },
          },
        },
      ],
    });
  });

  it('keeps every person for an install used by two accounts', async () => {
    const otherUserId = 'user:bob@example.com@okta';
    const { esClient } = makeEsClient({
      esqlRows: [[AGENT_ID, [OKTA_USER_ID, otherUserId]]],
      existingIds: [OKTA_USER_ID, otherUserId],
    });
    const { ctx, bulkUpdateEntity } = makeContext(esClient);

    await actsOnBehalfOfMaintainer.run(ctx);

    const [{ objects }] = bulkUpdateEntity.mock.calls[0];
    expect(objects[0].doc.entity.relationships.acts_on_behalf_of.ids).toEqual([
      OKTA_USER_ID,
      otherUserId,
    ]);
  });

  it('drops a resolution target that has no row', async () => {
    const { esClient } = makeEsClient({
      esqlRows: [[AGENT_ID, 'user:missing@example.com@okta']],
      existingIds: [],
    });
    const { ctx, bulkUpdateEntity } = makeContext(esClient);

    const result = await actsOnBehalfOfMaintainer.run(ctx);

    expect(bulkUpdateEntity).not.toHaveBeenCalled();
    expect(result).toMatchObject({ totalTargetIdsNotInStore: 1, totalWritten: 0 });
  });

  it('only discovers agent rows that carry an account email', async () => {
    const { esClient, search } = makeEsClient({ esqlRows: [], existingIds: [] });
    const { ctx } = makeContext(esClient);

    await actsOnBehalfOfMaintainer.run(ctx);

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'entities-latest-default',
        query: {
          bool: {
            filter: expect.arrayContaining([
              { term: { 'entity.EngineMetadata.Type': 'ai_agent' } },
              {
                bool: {
                  should: [
                    {
                      exists: {
                        field: 'entity.relationships.acts_on_behalf_of.raw_identifiers.user.email',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ]),
          },
        },
      }),
      expect.anything()
    );
  });
});
