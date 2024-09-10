/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  async function getLatestFleetPolicies(policyId: string): Promise<any> {
    const policyDocRes = await es.search({
      index: '.fleet-policies',
      query: {
        term: {
          policy_id: policyId,
        },
      },
      sort: [{ '@timestamp': 'desc' }],
    });

    return policyDocRes.hits.hits[0]?._source;
  }

  describe('fleet_proxies_crud', function () {
    const existingId = 'test-default-123';
    const fleetServerHostId = 'test-fleetserver-123';
    const policyId = 'test-policy-123';
    const outputId = 'test-output-123';
    let downloadSourceId: string;

    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();

      await kibanaServer.savedObjects.clean({
        types: ['fleet-proxy'],
      });
      await supertest
        .post(`/api/fleet/proxies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: existingId,
          name: 'Test 123',
          url: 'https://test.fr:3232',
        })
        .expect(200);
      await supertest
        .post(`/api/fleet/fleet_server_hosts`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: fleetServerHostId,
          name: 'Test 123',
          host_urls: ['https://fleetserverhost.fr:3232'],
          proxy_id: existingId,
        })
        .expect(200);
      await supertest
        .post(`/api/fleet/outputs`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: outputId,
          name: 'Test 123',
          type: 'elasticsearch',
          hosts: ['http://es:9200'],
          proxy_id: existingId,
        })
        .expect(200);

      const { body: downloadSourceResponse } = await supertest
        .post(`/api/fleet/agent_download_sources`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'My download source',
          host: 'http://test.fr:443',
          proxy_id: existingId,
          is_default: false,
        })
        .expect(200);

      downloadSourceId = downloadSourceResponse.item.id;

      await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: policyId,
          name: 'Test 123',
          namespace: 'default',
          fleet_server_host_id: fleetServerHostId,
          data_output_id: outputId,
          download_source_id: downloadSourceId,
        })
        .expect(200);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.clean({
        types: ['fleet-proxy'],
      });
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    describe('GET /proxies', () => {
      it('should list the fleet proxies', async () => {
        const { body: res } = await supertest.get(`/api/fleet/proxies`).expect(200);

        expect(res.items.length).to.be(1);
      });
    });

    describe('GET /proxies/{itemId}', () => {
      it('should return the requested fleet proxy', async () => {
        const { body: fleetServerHost } = await supertest
          .get(`/api/fleet/proxies/${existingId}`)
          .expect(200);

        expect(fleetServerHost).to.eql({
          item: {
            id: 'test-default-123',
            name: 'Test 123',
            url: 'https://test.fr:3232',
            is_preconfigured: false,
          },
        });
      });

      it('should return a 404 when retrieving a non existing fleet proxy', async function () {
        await supertest.get(`/api/fleet/proxies/idonotexists`).expect(404);
      });
    });

    describe('PUT /proxies/{itemId}', () => {
      it('should allow to update an existing fleet proxy', async function () {
        await supertest
          .put(`/api/fleet/proxies/${existingId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test 123 updated',
            url: 'https://testupdated.fr:3232',
          })
          .expect(200);

        const {
          body: { item: fleetServerHost },
        } = await supertest.get(`/api/fleet/proxies/${existingId}`).expect(200);

        expect(fleetServerHost.name).to.eql('Test 123 updated');

        const fleetPolicyAfter = await getLatestFleetPolicies(policyId);
        expect(fleetPolicyAfter?.data?.fleet?.proxy_url).to.be('https://testupdated.fr:3232');
        expect(fleetPolicyAfter?.data?.outputs?.[outputId].proxy_url).to.be(
          'https://testupdated.fr:3232'
        );
        expect(fleetPolicyAfter?.data?.agent.download.proxy_url).to.be(
          'https://testupdated.fr:3232'
        );
      });

      it('should return a 404 when updating a non existing fleet proxy', async function () {
        await supertest
          .put(`/api/fleet/proxies/idonotexists`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'new name',
          })
          .expect(404);
      });
    });

    describe('DELETE /proxies/{itemId}', () => {
      it('should allow to delete an existing fleet proxy', async function () {
        await supertest
          .delete(`/api/fleet/proxies/${existingId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const fleetPolicyAfter = await getLatestFleetPolicies(policyId);
        expect(fleetPolicyAfter?.data?.fleet?.proxy_url).to.be(undefined);
        expect(fleetPolicyAfter?.data?.outputs?.[outputId].proxy_url).to.be(undefined);
        expect(fleetPolicyAfter?.data?.agent.download.proxy_url).to.be(undefined);
      });
    });
  });
}
