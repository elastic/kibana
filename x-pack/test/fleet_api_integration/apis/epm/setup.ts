/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { GetInfoResponse, Installed } from '../../../../plugins/fleet/common';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const log = getService('log');
  const es = getService('es');

  describe('setup api', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);
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

    it('allows elastic/fleet-server user to call required APIs', async () => {
      const {
        body: { token },
        // @ts-expect-error SecurityCreateServiceTokenRequest should not require `name`
      } = await es.security.createServiceToken({
        namespace: 'elastic',
        service: 'fleet-server',
      });

      // elastic/fleet-server needs access to these APIs:
      // POST /api/fleet/setup
      // POST /api/fleet/agents/setup
      // GET /api/fleet/agent_policies
      // GET /api/fleet/enrollment-api-keys
      // GET /api/fleet/enrollment-api-keys/<id>
      await supertestWithoutAuth
        .post('/api/fleet/setup')
        .set('Authorization', `Bearer ${token.value}`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      await supertestWithoutAuth
        .post('/api/fleet/agents/setup')
        .set('Authorization', `Bearer ${token.value}`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      await supertestWithoutAuth
        .get('/api/fleet/agent_policies')
        .set('Authorization', `Bearer ${token.value}`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      const response = await supertestWithoutAuth
        .get('/api/fleet/enrollment-api-keys')
        .set('Authorization', `Bearer ${token.value}`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      const enrollmentApiKeyId = response.body.list[0].id;
      await supertestWithoutAuth
        .get(`/api/fleet/enrollment-api-keys/${enrollmentApiKeyId}`)
        .set('Authorization', `Bearer ${token.value}`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
    });
  });
}
