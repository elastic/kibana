/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { GetInfoResponse, Installed } from '../../../../plugins/fleet/common';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const log = getService('log');

  describe('setup api', async () => {
    skipIfNoDockerRegistry(providerContext);
    describe('setup performs upgrades', async () => {
      const oldEndpointVersion = '0.13.0';
      beforeEach(async () => {
        await supertest
          .post(`/api/fleet/epm/packages/endpoint-${oldEndpointVersion}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true })
          .expect(200);
      });
      it('upgrades the endpoint package from 0.13.0 to the latest version available', async function () {
        let { body }: { body: GetInfoResponse } = await supertest
          .get(`/api/fleet/epm/packages/endpoint-${oldEndpointVersion}`)
          .expect(200);
        const latestEndpointVersion = body.response.latestVersion;
        log.info(`Endpoint package latest version: ${latestEndpointVersion}`);
        // make sure we're actually doing an upgrade
        expect(latestEndpointVersion).not.eql(oldEndpointVersion);
        await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxxx').expect(200);

        ({ body } = await supertest
          .get(`/api/fleet/epm/packages/endpoint-${latestEndpointVersion}`)
          .expect(200));
        expect(body.response).to.have.property('savedObject');
        expect((body.response as Installed).savedObject.attributes.install_version).to.eql(
          latestEndpointVersion
        );
      });
    });
  });
}
