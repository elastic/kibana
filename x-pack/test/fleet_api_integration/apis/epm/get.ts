/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { warnAndSkipTest } from '../../helpers';

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertest');
  const dockerServers = getService('dockerServers');
  const server = dockerServers.get('registry');

  describe('EPM - get', () => {
    it('returns a 500 for a package key without a proper name', async function () {
      if (server.enabled) {
        await supertest.get('/api/fleet/epm/packages/-0.1.0').expect(500);
      } else {
        warnAndSkipTest(this, log);
      }
    });

    it('returns a 500 for a package key without a proper semver version', async function () {
      if (server.enabled) {
        await supertest.get('/api/fleet/epm/packages/endpoint-0.1.0.1.2.3').expect(500);
      } else {
        warnAndSkipTest(this, log);
      }
    });
  });
}
