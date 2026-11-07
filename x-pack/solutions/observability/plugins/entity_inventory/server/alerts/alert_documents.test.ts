/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getAlertDocuments } from './alert_documents';

const hit = (index: string, id: string, source: Record<string, string>) => ({
  _index: index,
  _id: id,
  _source: source,
});

describe('getAlertDocuments', () => {
  it('reads one classic alert by its uuid, limited to the space', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: {
        hits: [hit('.alerts-stack.alerts-default-000001', 'doc1', { 'kibana.alert.uuid': 'a1' })],
      },
    });

    const documents = await getAlertDocuments({
      esClient,
      source: 'classic',
      alertId: 'a1',
      spaceId: 'default',
    });

    const request = esClient.search.mock.calls[0][0];
    expect(request).toMatchObject({ index: '.alerts-stack.*,.alerts-observability.*', size: 1 });
    expect(JSON.stringify(request)).toContain('"kibana.alert.uuid":"a1"');
    expect(JSON.stringify(request)).toContain('"kibana.space_ids":"default"');
    expect(documents).toEqual([
      {
        index: '.alerts-stack.alerts-default-000001',
        id: 'doc1',
        document: { 'kibana.alert.uuid': 'a1' },
      },
    ]);
  });

  it('reads the newest events of a v2 alert, limited to the space', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { hits: [hit('.ds-.rule-events-1', 'e1', { status: 'breached' })] },
    });

    const documents = await getAlertDocuments({
      esClient,
      source: 'v2',
      alertId: 'v1',
      spaceId: 'default',
    });

    const request = esClient.search.mock.calls[0][0];
    expect(request).toMatchObject({
      index: '.rule-events',
      size: 5,
      sort: [{ '@timestamp': 'desc' }],
    });
    expect(JSON.stringify(request)).toContain('"alert.id":"v1"');
    expect(JSON.stringify(request)).toContain('"space_id":"default"');
    expect(documents[0].document).toEqual({ status: 'breached' });
  });

  it('returns nothing for an alert that does not exist', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { hits: [] },
    });

    expect(
      await getAlertDocuments({ esClient, source: 'classic', alertId: 'x', spaceId: 'default' })
    ).toEqual([]);
  });
});
