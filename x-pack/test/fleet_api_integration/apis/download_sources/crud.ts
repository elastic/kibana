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

  describe('fleet_download_sources_crud', async function () {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });
    setupFleetAndAgents(providerContext);

    let defaultDownloadSourceId: string;

    before(async function () {
      const { body: response } = await supertest
        .get(`/api/fleet/agent_download_sources`)
        .expect(200);

      const defaultDownloadSource = response.items.find((item: any) => item.is_default);
      if (!defaultDownloadSource) {
        throw new Error('default download source not set');
      }
      defaultDownloadSourceId = defaultDownloadSource.id;
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    describe('GET /agent_download_sources', () => {
      it('should list the default download source host', async () => {
        const { body: downloadSource } = await supertest
          .get(`/api/fleet/agent_download_sources`)
          .expect(200);

        expect(downloadSource.items[0]).to.eql({
          id: 'fleet-default-download-source',
          name: 'Elastic Artifacts',
          is_default: true,
          host: 'https://artifacts.elastic.co/downloads/',
        });
      });
    });

    describe('GET /agent_download_sources/{sourceId}', () => {
      it('should return the requested download source host', async () => {
        const { body: downloadSource } = await supertest
          .get(`/api/fleet/agent_download_sources/${defaultDownloadSourceId}`)
          .expect(200);

        expect(downloadSource).to.eql({
          item: {
            id: 'fleet-default-download-source',
            name: 'Elastic Artifacts',
            is_default: true,
            host: 'https://artifacts.elastic.co/downloads/',
          },
        });
      });
    });

    describe('PUT /agent_download_sources/{sourceId}', () => {
      it('should allow to update an existing download source', async function () {
        await supertest
          .put(`/api/fleet/agent_download_sources/${defaultDownloadSourceId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'new host1',
            host: 'https://test.co:403',
            is_default: false,
          })
          .expect(200);

        const {
          body: { item: downloadSource },
        } = await supertest
          .get(`/api/fleet/agent_download_sources/${defaultDownloadSourceId}`)
          .expect(200);

        expect(downloadSource.host).to.eql('https://test.co:403');
      });

      it('should allow to update an existing download source', async function () {
        await supertest
          .put(`/api/fleet/agent_download_sources/${defaultDownloadSourceId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'new default host',
            host: 'https://test.co',
            is_default: true,
          })
          .expect(200);

        await supertest.get(`/api/fleet/agent_download_sources`).expect(200);
      });

      it('should return a 404 when updating a non existing download source', async function () {
        await supertest
          .put(`/api/fleet/agent_download_sources/idonotexists`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'new host1',
            host: 'https://test.co',
            is_default: true,
          })
          .expect(404);
      });

      it('should return a 400 when passing a host that is not a valid uri', async function () {
        await supertest
          .put(`/api/fleet/agent_download_sources/${defaultDownloadSourceId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'new host1',
            host: 'not a valid uri',
            is_default: true,
          })
          .expect(400);
      });
    });

    describe('POST /agent_download_sources', () => {
      it('should allow to create a new download source host', async function () {
        const { body: postResponse } = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'My download source',
            host: 'http://test.fr:443',
            is_default: false,
          })
          .expect(200);

        const { id: _, ...itemWithoutId } = postResponse.item;
        expect(itemWithoutId).to.eql({
          name: 'My download source',
          host: 'http://test.fr:443',
          is_default: false,
        });
      });

      it('should toggle default download source when creating a new default one', async function () {
        await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'default download source host 1',
            host: 'https://test.co',
            is_default: true,
          })
          .expect(200);

        const {
          body: { item: downloadSource2 },
        } = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'default download source host 2',
            host: 'https://test2.co',
            is_default: true,
          })
          .expect(200);

        const {
          body: { items: downloadSources },
        } = await supertest.get(`/api/fleet/agent_download_sources`).expect(200);

        const defaultDownloadSource = downloadSources.filter((item: any) => item.is_default);
        expect(defaultDownloadSource).to.have.length(1);
        expect(defaultDownloadSource[0].id).eql(downloadSource2.id);
      });

      it('should return a 400 when passing a host that is not a valid uri', async function () {
        await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'new host1',
            host: 'not a valid uri',
            is_default: true,
          })
          .expect(400);
      });
    });

    describe('DELETE /agent_download_sources/{sourceId}', () => {
      let sourceId: string;
      let defaultDSIdToDelete: string;

      before(async () => {
        const { body: postResponse } = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Download source to delete test',
            host: 'https://test.co',
          })
          .expect(200);
        sourceId = postResponse.item.id;

        const { body: defaultDSPostResponse } = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Default download source to delete test',
            host: 'https://test.co',
            is_default: true,
          })
          .expect(200);
        defaultDSIdToDelete = defaultDSPostResponse.item.id;
      });

      it('should return a 400 when trying to delete a default download source host ', async function () {
        await supertest
          .delete(`/api/fleet/agent_download_sources/${defaultDSIdToDelete}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);
      });

      it('should return a 404 when deleting a non existing entry ', async function () {
        await supertest
          .delete(`/api/fleet/agent_download_sources/idonotexists`)
          .set('kbn-xsrf', 'xxxx')
          .expect(404);
      });

      it('should allow to delete a download source value ', async function () {
        const { body: deleteResponse } = await supertest
          .delete(`/api/fleet/agent_download_sources/${sourceId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(deleteResponse.id).to.eql(sourceId);
      });
    });
  });
}
