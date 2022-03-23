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

  describe('Remote clusters', function () {
    this.onlyEsVersion('<=7');

    describe('GET /api/upgrade_assistant/remote_clusters', () => {
      before(async () => {
        try {
          // Configure a remote cluster
          await es.cluster.putSettings({
            body: {
              persistent: {
                cluster: {
                  remote: {
                    test_cluster: {
                      seeds: ['127.0.0.1:9400'],
                    },
                  },
                },
              },
            },
          });
        } catch (e) {
          log.debug('Error creating remote cluster');
          throw e;
        }
      });

      after(async () => {
        try {
          // Delete remote cluster
          await es.cluster.putSettings({
            body: {
              persistent: {
                cluster: {
                  remote: {
                    test_cluster: {
                      seeds: null,
                    },
                  },
                },
              },
            },
          });
        } catch (e) {
          log.debug('Error deleting remote cluster');
          throw e;
        }
      });

      it('returns an array of remote clusters', async () => {
        const { body: apiRequestResponse } = await supertest
          .get(`${API_BASE_PATH}/remote_clusters`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(Array.isArray(apiRequestResponse)).be(true);
        expect(apiRequestResponse.length).be(1);
      });
    });
  });
}
