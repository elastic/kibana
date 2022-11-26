/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('fleet_proxies_crud', async function () {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
    });
    setupFleetAndAgents(providerContext);

    const existingId = 'test-default-123';

    before(async function () {
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
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
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
          })
          .expect(200);

        const {
          body: { item: fleetServerHost },
        } = await supertest.get(`/api/fleet/proxies/${existingId}`).expect(200);

        expect(fleetServerHost.name).to.eql('Test 123 updated');
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
  });
}
