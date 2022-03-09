/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PRECONFIGURATION_API_ROUTES } from '../../../../plugins/fleet/common/constants';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');

  // use function () {} and not () => {} here
  // because `this` has to point to the Mocha context
  // see https://mochajs.org/#arrow-functions

  describe('Preconfiguration', async () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await getService('esArchiver').load('x-pack/test/functional/es_archives/empty_kibana');
      await getService('esArchiver').load(
        'x-pack/test/functional/es_archives/fleet/empty_fleet_server'
      );
    });

    after(async () => {
      await getService('esArchiver').unload(
        'x-pack/test/functional/es_archives/fleet/empty_fleet_server'
      );
      await getService('esArchiver').unload('x-pack/test/functional/es_archives/empty_kibana');
    });

    // Basic health check for the API; functionality is covered by the unit tests
    it('should succeed with an empty payload', async () => {
      const { body } = await supertest
        .put(PRECONFIGURATION_API_ROUTES.UPDATE_PATTERN)
        .set('kbn-xsrf', 'xxxx')
        .send({})
        .expect(200);

      expect(body.nonFatalErrors).to.eql([]);
    });
  });
}
