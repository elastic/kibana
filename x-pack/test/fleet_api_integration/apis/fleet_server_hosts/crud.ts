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

  describe('fleet_fleet_server_hosts_crud', async function () {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
    });
    setupFleetAndAgents(providerContext);

    let defaultFleetServerHostId: string;

    before(async function () {
      await kibanaServer.savedObjects.clean({
        types: ['fleet-fleet-server-host'],
      });
      const { body: defaultRes } = await supertest
        .post(`/api/fleet/fleet_server_hosts`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: 'test-default-123',
          name: 'Default',
          is_default: true,
          host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
        })
        .expect(200);

      await supertest
        .post(`/api/fleet/fleet_server_hosts`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test',
          host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
        })
        .expect(200);

      defaultFleetServerHostId = defaultRes.item.id;
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    describe('GET /fleet_server_hosts', () => {
      it('should list the fleet server hosts', async () => {
        const { body: res } = await supertest.get(`/api/fleet/fleet_server_hosts`).expect(200);

        expect(res.items.length).to.be(2);
      });
    });

    describe('GET /fleet_server_hosts/{itemId}', () => {
      it('should return the requested fleet server host', async () => {
        const { body: fleetServerHost } = await supertest
          .get(`/api/fleet/fleet_server_hosts/${defaultFleetServerHostId}`)
          .expect(200);

        expect(fleetServerHost).to.eql({
          item: {
            id: 'test-default-123',
            name: 'Default',
            is_default: true,
            host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
            is_preconfigured: false,
          },
        });
      });

      it('should return a 404 when retrieving a non existing fleet server host', async function () {
        await supertest.get(`/api/fleet/fleet_server_hosts/idonotexists`).expect(404);
      });
    });

    describe('PUT /fleet_server_hosts/{itemId}', () => {
      it('should allow to update an existing fleet server host', async function () {
        await supertest
          .put(`/api/fleet/fleet_server_hosts/${defaultFleetServerHostId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Default updated',
          })
          .expect(200);

        const {
          body: { item: fleetServerHost },
        } = await supertest
          .get(`/api/fleet/fleet_server_hosts/${defaultFleetServerHostId}`)
          .expect(200);

        expect(fleetServerHost.name).to.eql('Default updated');
      });

      it('should return a 404 when updating a non existing fleet server host', async function () {
        await supertest
          .put(`/api/fleet/fleet_server_hosts/idonotexists`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'new host1',
          })
          .expect(404);
      });
    });

    describe('POST /fleet_server_hosts', () => {
      it('should allow to create a default fleet server host with id', async function () {
        const id = `test-${Date.now()}`;

        await supertest
          .post(`/api/fleet/fleet_server_hosts`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Default ${Date.now()}`,
            host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
            is_default: true,
            id,
          })
          .expect(200);

        const {
          body: { item: fleetServerHost },
        } = await supertest.get(`/api/fleet/fleet_server_hosts/${id}`).expect(200);

        expect(fleetServerHost.is_default).to.be(true);
      });

      it('should not unset default fleet server host on id conflict', async function () {
        const id = `test-${Date.now()}`;

        await supertest
          .post(`/api/fleet/fleet_server_hosts`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Default ${Date.now()}`,
            host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
            is_default: true,
            id,
          })
          .expect(200);

        await supertest
          .post(`/api/fleet/fleet_server_hosts`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Default ${Date.now()}`,
            host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
            is_default: true,
            id,
          })
          .expect(409);

        const {
          body: { item: fleetServerHost },
        } = await supertest.get(`/api/fleet/fleet_server_hosts/${id}`).expect(200);

        expect(fleetServerHost.is_default).to.be(true);
      });
    });
  });
}
