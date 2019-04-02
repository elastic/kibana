/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { API_BASE_PATH, NODE_SEED } from './constants';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('Remote Clusters', () => {
    describe('Empty List', () => {
      it('should return an empty array when there are no remote clusters', async () => {
        const uri = `${API_BASE_PATH}`;

        const { body } = await supertest
          .get(uri)
          .expect(200);

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
            seeds: [
              NODE_SEED
            ],
            skipUnavailable: true,
          })
          .expect(200);

        expect(body).to.eql({
          name: 'test_cluster',
          seeds: [
            NODE_SEED
          ],
          skipUnavailable: 'true', // ES issue #35671
          isConfiguredByNode: false,
        });
      });
      it('should not allow us to re-add an existing remote cluster', async () => {
        const uri = `${API_BASE_PATH}`;

        const { body } = await supertest
          .post(uri)
          .set('kbn-xsrf', 'xxx')
          .send({
            name: 'test_cluster',
            seeds: [
              NODE_SEED
            ]
          })
          .expect(409);

        expect(body).to.eql({
          statusCode: 409,
          error: 'Conflict',
          message: 'There is already a remote cluster with that name.'
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
            seeds: [
              NODE_SEED
            ],
          })
          .expect(200);

        expect(body).to.eql({
          name: 'test_cluster',
          skipUnavailable: 'false', // ES issue #35671
          seeds: [
            NODE_SEED
          ],
          isConfiguredByNode: false,
        });
      });

      it(`fails if seeds aren't provided`, async () => {
        const uri = `${API_BASE_PATH}/test_cluster`;

        await supertest
          .put(uri)
          .set('kbn-xsrf', 'xxx')
          .send({
            skipUnavailable: true,
          })
          .expect(400);
      });
    });

    describe('List', () => {
      it('should return an array of remote clusters', async () => {
        const uri = `${API_BASE_PATH}`;

        const { body } = await supertest
          .get(uri)
          .expect(200);

        expect(body).to.eql([
          {
            name: 'test_cluster',
            seeds: [
              NODE_SEED
            ],
            isConnected: true,
            connectedNodesCount: 1,
            maxConnectionsPerCluster: 3,
            initialConnectTimeout: '30s',
            skipUnavailable: false,
            isConfiguredByNode: false,
          }
        ]);
      });
    });

    describe('Delete', () => {
      it('should allow us to delete a remote cluster', async () => {
        const uri = `${API_BASE_PATH}/test_cluster`;

        const { body } = await supertest
          .delete(uri)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(body).to.eql({});
      });
    });
  });
}
