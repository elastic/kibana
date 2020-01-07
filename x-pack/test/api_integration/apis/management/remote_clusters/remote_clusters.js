/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { API_BASE_PATH } from './constants';

export default function({ getService }) {
  const supertest = getService('supertest');
  const retry = getService('retry');

  const esTransportPort = process.env.TEST_ES_TRANSPORT_PORT
    ? process.env.TEST_ES_TRANSPORT_PORT.split('-')[0]
    : '9300';
  const NODE_SEED = `localhost:${esTransportPort}`;

  describe('Remote Clusters', function() {
    this.tags(['skipCloud']);

    describe('Empty List', () => {
      it('should return an empty array when there are no remote clusters', async () => {
        const uri = `${API_BASE_PATH}`;

        const { body } = await supertest.get(uri).expect(200);

        expect(body).to.eql([]);
      });
    });

    describe('Add', () => {
      it('should allow us to add a remote cluster', async () => {
        const uri = `${API_BASE_PATH}`;

        const { body } = await supertest
          .post(uri)
          .set('kbn-xsrf', 'xxx')
          .send({
            name: 'test_cluster',
            seeds: [NODE_SEED],
            skipUnavailable: true,
          })
          .expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });
      });

      it('should not allow us to re-add an existing remote cluster', async () => {
        const uri = `${API_BASE_PATH}`;

        const { body } = await supertest
          .post(uri)
          .set('kbn-xsrf', 'xxx')
          .send({
            name: 'test_cluster',
            seeds: [NODE_SEED],
          })
          .expect(409);

        expect(body).to.eql({
          statusCode: 409,
          error: 'Conflict',
          message: 'There is already a remote cluster with that name.',
        });
      });
    });

    describe('Update', () => {
      it('should allow us to update an existing remote cluster', async () => {
        const uri = `${API_BASE_PATH}/test_cluster`;

        const { body } = await supertest
          .put(uri)
          .set('kbn-xsrf', 'xxx')
          .send({
            skipUnavailable: false,
            seeds: [NODE_SEED],
          })
          .expect(200);

        expect(body).to.eql({
          name: 'test_cluster',
          skipUnavailable: 'false', // ES issue #35671
          seeds: [NODE_SEED],
          isConfiguredByNode: false,
        });
      });
    });

    describe('List', () => {
      it('should return an array of remote clusters', async () => {
        const uri = `${API_BASE_PATH}`;

        await retry.try(async () => {
          // The API to connect a remote clusters is not synchronous so we need to retry several times to avoid any flakiness.
          const { body } = await supertest.get(uri);

          expect(body).to.eql([
            {
              name: 'test_cluster',
              seeds: [NODE_SEED],
              isConnected: true,
              connectedNodesCount: 1,
              maxConnectionsPerCluster: 3,
              initialConnectTimeout: '30s',
              skipUnavailable: false,
              isConfiguredByNode: false,
            },
          ]);
        });
      });
    });

    describe('Delete', () => {
      it('should allow us to delete a remote cluster', async () => {
        const uri = `${API_BASE_PATH}/test_cluster`;

        const { body } = await supertest
          .delete(uri)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(body).to.eql({
          itemsDeleted: ['test_cluster'],
          errors: [],
        });
      });

      it('should allow us to delete multiple remote clusters', async () => {
        // Create clusters to delete.
        await supertest
          .post(API_BASE_PATH)
          .set('kbn-xsrf', 'xxx')
          .send({
            name: 'test_cluster1',
            seeds: [NODE_SEED],
            skipUnavailable: true,
          })
          .expect(200);

        await supertest
          .post(API_BASE_PATH)
          .set('kbn-xsrf', 'xxx')
          .send({
            name: 'test_cluster2',
            seeds: [NODE_SEED],
            skipUnavailable: true,
          })
          .expect(200);

        const uri = `${API_BASE_PATH}/test_cluster1,test_cluster2`;

        const {
          body: { itemsDeleted, errors },
        } = await supertest
          .delete(uri)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(errors).to.eql([]);

        // The order isn't guaranteed, so we assert against individual names instead of asserting
        // against the value of the array itself.
        ['test_cluster1', 'test_cluster2'].forEach(clusterName => {
          expect(itemsDeleted.includes(clusterName)).to.be(true);
        });
      });

      it(`should tell us which remote clusters couldn't be deleted`, async () => {
        const uri = `${API_BASE_PATH}/test_cluster_doesnt_exist`;

        const { body } = await supertest
          .delete(uri)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(body).to.eql({
          itemsDeleted: [],
          errors: [
            {
              name: 'test_cluster_doesnt_exist',
              error: {
                isBoom: true,
                isServer: false,
                data: null,
                output: {
                  statusCode: 404,
                  payload: {
                    statusCode: 404,
                    error: 'Not Found',
                    message: 'There is no remote cluster with that name.',
                  },
                  headers: {},
                },
              },
            },
          ],
        });
      });
    });
  });
}
