/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { k8sNodeDefinition } from './definitions/k8s_definitions';
import { listEntities } from './list_entities';

const window = { from: '2026-11-03T10:00:00.000Z', to: '2026-11-03T11:00:00.000Z' };

const twoSourceDefinition = {
  ...k8sNodeDefinition,
  dynamic: { sources: [{ indexPattern: 'a-*' }, { indexPattern: 'b-*' }] },
};

describe('listEntities', () => {
  it('runs the generated query as TS when every index behind the source is time series', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getSettings.mockResolvedValue({
      '.ds-a-1': { settings: { index: { mode: 'time_series' } } },
    });
    esClient.esql.query.mockResolvedValue({
      columns: [
        { name: 'entity.id', type: 'keyword' },
        { name: 'k8s.node.name', type: 'keyword' },
      ],
      values: [['k8s.node:n1', 'n1']],
    });

    const entities = await listEntities({
      esClient,
      definition: k8sNodeDefinition,
      window,
      limit: 10000,
    });

    expect(esClient.esql.query.mock.calls[0][0].query).toContain('TS metrics-kubeletstatsreceiver');
    expect(entities).toEqual([{ 'entity.id': 'k8s.node:n1', 'k8s.node.name': 'n1' }]);
  });

  it('falls back to FROM when an index is not time series', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getSettings.mockResolvedValue({
      '.ds-a-1': { settings: { index: { mode: 'time_series' } } },
      '.ds-a-2': { settings: { index: {} } },
    });
    esClient.esql.query.mockResolvedValue({ columns: [], values: [] });

    await listEntities({ esClient, definition: k8sNodeDefinition, window, limit: 10000 });

    expect(esClient.esql.query.mock.calls[0][0].query).toContain(
      'FROM metrics-kubeletstatsreceiver'
    );
  });

  it('merges the rows of one entity from several sources, keeping the latest last_seen', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getSettings.mockResolvedValue({});
    const columns = [
      { name: 'entity.id', type: 'keyword' },
      { name: 'k8s.node.name', type: 'keyword' },
      { name: 'k8s.cluster.name', type: 'keyword' },
      { name: 'last_seen', type: 'date' },
    ];
    esClient.esql.query
      .mockResolvedValueOnce({
        columns,
        values: [['k8s.node:n1', 'n1', null, '2026-11-03T10:10:00.000Z']],
      })
      .mockResolvedValueOnce({
        columns,
        values: [['k8s.node:n1', 'n1', 'c1', '2026-11-03T10:50:00.000Z']],
      });

    const entities = await listEntities({
      esClient,
      definition: twoSourceDefinition,
      window,
      limit: 10000,
    });

    expect(entities).toEqual([
      {
        'entity.id': 'k8s.node:n1',
        'k8s.node.name': 'n1',
        'k8s.cluster.name': 'c1',
        last_seen: '2026-11-03T10:50:00.000Z',
      },
    ]);
  });
});
