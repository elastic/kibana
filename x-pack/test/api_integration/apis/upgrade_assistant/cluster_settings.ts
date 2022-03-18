/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { API_BASE_PATH } from '../../../../plugins/upgrade_assistant/common/constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  describe.skip('Cluster settings', () => {
    describe('POST /api/upgrade_assistant/cluster_settings', () => {
      before(async () => {
        try {
          // Configure some deprecated cluster settings
          await es.cluster.putSettings({
            body: {
              persistent: {
                'cluster.routing.allocation.exclude._tier': 'data_cold',
              },
              transient: {
                'cluster.routing.allocation.include._tier': 'data_hot',
              },
            },
          });
        } catch (e) {
          log.debug('Error updating cluster settings');
          throw e;
        }
      });

      it('removes cluster setting', async () => {
        const { body: apiRequestResponse } = await supertest
          .post(`${API_BASE_PATH}/cluster_settings`)
          .set('kbn-xsrf', 'xxx')
          .send({
            settings: [
              'cluster.routing.allocation.exclude._tier',
              'cluster.routing.allocation.include._tier',
            ], // cluster settings to remove
          })
          .expect(200);

        expect(apiRequestResponse.persistent['cluster.routing.allocation.exclude._tier']).be(
          undefined
        );
        expect(apiRequestResponse.transient['cluster.routing.allocation.include._tier']).be(
          undefined
        );
      });
    });
  });
}
