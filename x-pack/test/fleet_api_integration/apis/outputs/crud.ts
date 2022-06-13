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

  describe('fleet_output_crud', async function () {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });
    setupFleetAndAgents(providerContext);

    let defaultOutputId: string;

    before(async function () {
      const { body: getOutputsRes } = await supertest.get(`/api/fleet/outputs`).expect(200);

      const defaultOutput = getOutputsRes.items.find((item: any) => item.is_default);
      if (!defaultOutput) {
        throw new Error('default output not set');
      }

      defaultOutputId = defaultOutput.id;
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    describe('GET /outputs', () => {
      it('should list the default output', async () => {
        const { body: getOutputsRes } = await supertest.get(`/api/fleet/outputs`).expect(200);

        expect(getOutputsRes.items.length).to.eql(1);
      });
    });

    describe('GET /outputs/{outputId}', () => {
      it('should allow return the default output', async () => {
        const { body: getOutputRes } = await supertest
          .get(`/api/fleet/outputs/${defaultOutputId}`)
          .expect(200);

        expect(getOutputRes.item).to.have.keys('id', 'name', 'type', 'is_default', 'hosts');
      });
    });

    describe('PUT /outputs/{outputId}', () => {
      it('should explicitly set port on ES hosts', async function () {
        await supertest
          .put(`/api/fleet/outputs/${defaultOutputId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ hosts: ['https://test.fr'] })
          .expect(200);

        const {
          body: { item: output },
        } = await supertest.get(`/api/fleet/outputs/${defaultOutputId}`).expect(200);

        expect(output.hosts).to.eql(['https://test.fr:443']);
      });

      it('should return a 404 when updating a non existing output', async function () {
        await supertest
          .put(`/api/fleet/outputs/idonotexists`)
          .set('kbn-xsrf', 'xxxx')
          .send({ hosts: ['https://test.fr'] })
          .expect(404);
      });
    });

    describe('POST /outputs', () => {
      it('should allow to create an output ', async function () {
        const { body: postResponse } = await supertest
          .post(`/api/fleet/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .send({ name: 'My output', type: 'elasticsearch', hosts: ['https://test.fr'] })
          .expect(200);

        const { id: _, ...itemWithoutId } = postResponse.item;
        expect(itemWithoutId).to.eql({
          name: 'My output',
          type: 'elasticsearch',
          hosts: ['https://test.fr:443'],
          is_default: false,
          is_default_monitoring: false,
        });
      });

      it('should allow to create a logstash output ', async function () {
        const { body: postResponse } = await supertest
          .post(`/api/fleet/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'My Logstash Output',
            type: 'logstash',
            hosts: ['test.fr:443'],
            ssl: {
              certificate: 'CERTIFICATE',
              key: 'KEY',
              certificate_authorities: ['CA1', 'CA2'],
            },
          })
          .expect(200);

        const { id: _, ...itemWithoutId } = postResponse.item;
        expect(itemWithoutId).to.eql({
          name: 'My Logstash Output',
          type: 'logstash',
          hosts: ['test.fr:443'],
          is_default: false,
          is_default_monitoring: false,
          ssl: {
            certificate: 'CERTIFICATE',
            key: 'KEY',
            certificate_authorities: ['CA1', 'CA2'],
          },
        });
      });

      it('should not allow to create a logstash output with http hosts ', async function () {
        const { body: postResponse } = await supertest
          .post(`/api/fleet/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'My Logstash Output',
            type: 'logstash',
            hosts: ['https://test.fr:443'],
            ssl: {
              certificate: 'CERTIFICATE',
              key: 'KEY',
              certificate_authorities: ['CA1', 'CA2'],
            },
          })
          .expect(400);

        expect(postResponse.message).match(
          /Host address must begin with a domain name or IP address/
        );
      });

      it('should toggle default output when creating a new default output ', async function () {
        await supertest
          .post(`/api/fleet/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'default output 1',
            type: 'elasticsearch',
            hosts: ['https://test.fr'],
            is_default: true,
          })
          .expect(200);

        const {
          body: { item: output2 },
        } = await supertest
          .post(`/api/fleet/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'default output 2',
            type: 'elasticsearch',
            hosts: ['https://test.fr'],
            is_default: true,
          })
          .expect(200);

        const {
          body: { items: outputs },
        } = await supertest.get(`/api/fleet/outputs`).expect(200);

        const defaultOutputs = outputs.filter((o: any) => o.is_default);
        expect(defaultOutputs).to.have.length(1);
        expect(defaultOutputs[0].id).eql(output2.id);
      });

      it('should toggle default monitoring output when creating a new default monitoring output ', async function () {
        await supertest
          .post(`/api/fleet/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'default monitoring output 1',
            type: 'elasticsearch',
            hosts: ['https://test.fr'],
            is_default_monitoring: true,
          })
          .expect(200);

        const {
          body: { item: output2 },
        } = await supertest
          .post(`/api/fleet/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'default monitoring output 2',
            type: 'elasticsearch',
            hosts: ['https://test.fr'],
            is_default_monitoring: true,
          })
          .expect(200);

        const {
          body: { items: outputs },
        } = await supertest.get(`/api/fleet/outputs`).expect(200);

        const defaultOutputs = outputs.filter((o: any) => o.is_default_monitoring);
        expect(defaultOutputs).to.have.length(1);
        expect(defaultOutputs[0].id).eql(output2.id);
      });
    });

    describe('DELETE /outputs/{outputId}', () => {
      let outputId: string;
      let defaultOutputIdToDelete: string;
      let defaultMonitoringOutputId: string;

      before(async () => {
        const { body: postResponse } = await supertest
          .post(`/api/fleet/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Output to delete test',
            type: 'elasticsearch',
            hosts: ['https://test.fr'],
          })
          .expect(200);
        outputId = postResponse.item.id;

        const { body: defaultOutputPostResponse } = await supertest
          .post(`/api/fleet/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Default Output to delete test',
            type: 'elasticsearch',
            hosts: ['https://test.fr'],
            is_default: true,
          })
          .expect(200);
        defaultOutputIdToDelete = defaultOutputPostResponse.item.id;
        const { body: defaultMonitoringOutputPostResponse } = await supertest
          .post(`/api/fleet/outputs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Default Output to delete test',
            type: 'elasticsearch',
            hosts: ['https://test.fr'],
            is_default_monitoring: true,
          })
          .expect(200);
        defaultMonitoringOutputId = defaultMonitoringOutputPostResponse.item.id;
      });

      it('should return a 400 when deleting a default output ', async function () {
        await supertest
          .delete(`/api/fleet/outputs/${defaultOutputIdToDelete}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);
      });

      it('should return a 400 when deleting a default output ', async function () {
        await supertest
          .delete(`/api/fleet/outputs/${defaultMonitoringOutputId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);
      });

      it('should return a 404 when deleting a non existing output ', async function () {
        await supertest
          .delete(`/api/fleet/outputs/idonotexists`)
          .set('kbn-xsrf', 'xxxx')
          .expect(404);
      });

      it('should allow to delete an output ', async function () {
        const { body: deleteResponse } = await supertest
          .delete(`/api/fleet/outputs/${outputId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(deleteResponse.id).to.eql(outputId);
      });
    });
  });
}
