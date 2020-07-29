/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');

  describe('package error handling', async () => {
    skipIfNoDockerRegistry(providerContext);
    it('should return 404 if package does not exist', async function () {
      await supertest
        .post(`/api/ingest_manager/epm/packages/nonexistent-0.1.0`)
        .set('kbn-xsrf', 'xxxx')
        .expect(404);
      let res;
      try {
        res = await kibanaServer.savedObjects.get({
          type: 'epm-package',
          id: 'nonexistent',
        });
      } catch (err) {
        res = err;
      }
      expect(res.response.data.statusCode).equal(404);
    });
    it('should return 400 if trying to update/install to an out-of-date package', async function () {
      await supertest
        .post(`/api/ingest_manager/epm/packages/outdated-0.1.0`)
        .set('kbn-xsrf', 'xxxx')
        .expect(400);
      let res;
      try {
        res = await kibanaServer.savedObjects.get({
          type: 'epm-package',
          id: 'oudated',
        });
      } catch (err) {
        res = err;
      }
      expect(res.response.data.statusCode).equal(404);
    });
  });
}
