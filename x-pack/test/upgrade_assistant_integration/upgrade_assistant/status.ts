/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { ClusterStateAPIResponse } from '../../../plugins/upgrade_assistant/common/types';
import { getIndexStateFromClusterState } from '../../../plugins/upgrade_assistant/common/get_index_state_from_cluster_state';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  describe('status and _cluster/state contract', () => {
    beforeEach(async () => {
      await es.indices.open({ index: '7.0-data' });
    });

    afterEach(async () => {
      await es.indices.open({ index: '7.0-data' });
    });

    // According to https://www.elastic.co/guide/en/elasticsearch/reference/7.6/cluster-state.html
    // The response from this call is considered internal and subject to change. We check that
    // the contract has not changed in this integration test.
    it('the _cluster/state endpoint is still what we expect', async () => {
      await esArchiver.load('upgrade_assistant/reindex');
      await es.indices.close({ index: '7.0-data' });
      const result = await es.cluster.state<ClusterStateAPIResponse>({
        index: '7.0-data',
        metric: 'metadata',
      });

      try {
        if (getIndexStateFromClusterState('7.0-data', result.body) === 'close') {
          return;
        }
      } catch (e) {
        expect().fail(
          `Can no longer access index open/closed state. Please update Upgrade Assistant checkup. (${e.message})`
        );
        return;
      }
      expect().fail(
        `The response contract for _cluster/state metadata has changed. Please update Upgrade Assistant checkup. Received ${JSON.stringify(
          result,
          null,
          2
        )}.

Expected body.metadata.indices['7.0-data'].state to be "close".`
      );
    });
  });
}
