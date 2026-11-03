/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import {
  createPodAdhocAttackDiscoveryDataClient,
  getAdhocAttackDiscoveryIndex,
} from './adhoc_data_client';

describe('createPodAdhocAttackDiscoveryDataClient', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const client = createPodAdhocAttackDiscoveryDataClient(() => esClient);

  beforeEach(() => jest.clearAllMocks());

  it('names the index the way rule registry does', () => {
    expect(client.indexNameWithNamespace('default')).toBe(
      '.adhoc.alerts-security.attack.discovery.alerts-default'
    );
    expect(getAdhocAttackDiscoveryIndex('my-space')).toBe(
      '.adhoc.alerts-security.attack.discovery.alerts-my-space'
    );
  });

  it('searches the space index', async () => {
    await client.getReader({ namespace: 'my-space' }).search({ size: 1 });

    expect(esClient.search).toHaveBeenCalledWith({
      size: 1,
      index: '.adhoc.alerts-security.attack.discovery.alerts-my-space',
      ignore_unavailable: true,
      seq_no_primary_term: true,
    });
  });

  it('bulk writes to the space alias, defaulting to the default space', async () => {
    const writer = await client.getWriter();
    await writer.bulk({ body: [], refresh: true });

    expect(esClient.bulk).toHaveBeenCalledWith(
      {
        body: [],
        refresh: true,
        require_alias: true,
        index: '.adhoc.alerts-security.attack.discovery.alerts-default',
      },
      { meta: true }
    );
  });
});
