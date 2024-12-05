/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import sinon from 'sinon';
import {
  getClusterUuids,
  fetchClusterUuids,
  handleClusterUuidsResponse,
} from './get_cluster_uuids';

describe('get_cluster_uuids', () => {
  const searchMock = sinon.stub();
  const callCluster = { search: searchMock } as unknown as ElasticsearchClient;

  afterEach(() => {
    searchMock.reset();
  });

  const response = {
    aggregations: {
      cluster_uuids: {
        buckets: [{ key: 'abc' }, { key: 'xyz' }, { key: '123' }],
      },
    },
  };

  const expectedUuids = response.aggregations.cluster_uuids.buckets.map((bucket) => bucket.key);

  const timestamp = Date.now();

  describe('getClusterUuids', () => {
    it('returns cluster UUIDs', async () => {
      searchMock.returns(Promise.resolve(response));
      expect(await getClusterUuids(callCluster, timestamp, 1)).toStrictEqual(expectedUuids);
    });
  });

  describe('fetchClusterUuids', () => {
    it('searches for clusters', async () => {
      searchMock.returns(Promise.resolve(response));
      expect(await fetchClusterUuids(callCluster, timestamp, 1)).toStrictEqual(response);
    });
  });

  describe('handleClusterUuidsResponse', () => {
    // filter_path makes it easy to ignore anything unexpected because it will come back empty
    it('handles unexpected response', () => {
      const clusterUuids = handleClusterUuidsResponse({});
      expect(clusterUuids.length).toStrictEqual(0);
    });

    it('handles valid response', () => {
      const clusterUuids = handleClusterUuidsResponse(response);
      expect(clusterUuids).toStrictEqual(expectedUuids);
    });

    it('handles no buckets response', () => {
      const clusterUuids = handleClusterUuidsResponse({
        aggregations: {
          cluster_uuids: {
            buckets: [],
          },
        },
      });

      expect(clusterUuids.length).toStrictEqual(0);
    });
  });
});
