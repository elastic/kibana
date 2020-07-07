/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { warnAndSkipTest } from '../../helpers';

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertest');
  const dockerServers = getService('dockerServers');

  const server = dockerServers.get('registry');
  // use function () {} and not () => {} here
  // because `this` has to point to the Mocha context
  // see https://mochajs.org/#arrow-functions

  describe('EPM - list', async function () {
    it('lists all packages from the registry', async function () {
      if (server.enabled) {
        const fetchPackageList = async () => {
          const response = await supertest
            .get('/api/ingest_manager/epm/packages')
            .set('kbn-xsrf', 'xxx')
            .expect(200);
          return response.body;
        };
        const listResponse = await fetchPackageList();
        expect(listResponse.response.length).to.be(12);
      } else {
        warnAndSkipTest(this, log);
      }
    });
  });
}
