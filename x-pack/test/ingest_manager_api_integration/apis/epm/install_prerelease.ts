/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { warnAndSkipTest } from '../../helpers';
import { deletePackage } from './install_overrides';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const dockerServers = getService('dockerServers');
  const log = getService('log');

  const pkgkey = 'prerelease-0.1.0-dev.0+abc';
  const server = dockerServers.get('registry');

  describe('installs package that has a prerelease version', async () => {
    after(async () => {
      if (server.enabled) {
        // remove the package just in case it being installed will affect other tests
        await deletePackage(supertest, pkgkey);
      }
    });

    it('should install the package correctly', async function () {
      if (server.enabled) {
        await supertest
          .post(`/api/ingest_manager/epm/packages/${pkgkey}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      } else {
        warnAndSkipTest(this, log);
      }
    });
  });
}
