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

  let pkgVersion: string;

  describe('fleet_outputs_elasticsearch', async function () {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });
    setupFleetAndAgents(providerContext);

    let defaultOutputId: string;
    // let ESOutputId: string;
    let fleetServerPolicyId: string;
    // let fleetServerPolicyWithCustomOutputId: string;

    before(async function () {
      // we must first force install the fleet_server package to override package verification error on policy create
      // https://github.com/elastic/kibana/issues/137450
      const getPkRes = await supertest
        .get(`/api/fleet/epm/packages/fleet_server`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      pkgVersion = getPkRes.body.item.version;

      await supertest
        .post(`/api/fleet/epm/packages/fleet_server/${pkgVersion}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      let { body: apiResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'kibana')
        .send({
          name: 'Fleet Server policy 1',
          namespace: 'default',
          has_fleet_server: true,
        })
        .expect(200);
      const fleetServerPolicy = apiResponse.item;
      fleetServerPolicyId = fleetServerPolicy.id;

      ({ body: apiResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'kibana')
        .send({
          name: 'Agent policy 1',
          namespace: 'default',
        })
        .expect(200));

      const agentPolicy = apiResponse.item;

      if (!fleetServerPolicy) {
        throw new Error('No Fleet server policy');
      }

      if (!agentPolicy) {
        throw new Error('No agent policy');
      }

      await supertest
        .post(`/api/fleet/fleet_server_hosts`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: 'test-default-123',
          name: 'Default',
          is_default: true,
          host_urls: ['https://test.fr:8080'],
        })
        .expect(200);

      const { body: getOutputsRes } = await supertest.get(`/api/fleet/outputs`).expect(200);

      const defaultOutput = getOutputsRes.items.find((item: any) => item.is_default);
      if (!defaultOutput) {
        throw new Error('default output not set');
      }

      defaultOutputId = defaultOutput.id;

      // const { body: postResponse1 } = await supertest
      //   .post(`/api/fleet/outputs/elasticsearch`)
      //   .set('kbn-xsrf', 'xxxx')
      //   .send({
      //     name: 'ESoutput',
      //     hosts: ['https://test.fr'],
      //   })
      //   .expect(200);
      // ESOutputId = postResponse1.item.id;

      // ({ body: apiResponse } = await supertest
      //   .post(`/api/fleet/agent_policies`)
      //   .set('kbn-xsrf', 'kibana')
      //   .send({
      //     name: 'Preconfigured Fleet Server policy',
      //     namespace: 'default',
      //     has_fleet_server: true,
      //     data_output_id: `${ESOutputId}`,
      //   })
      //   .expect(200));
      // const fleetServerPolicyWithCustomOutput = apiResponse.item;
      // fleetServerPolicyWithCustomOutputId = fleetServerPolicyWithCustomOutput.id;
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    describe('PUT /outputs/{outputId}/elasticsearch', () => {
      it('should explicitly set port on ES hosts', async function () {
        await supertest
          .put(`/api/fleet/outputs/${defaultOutputId}/elasticsearch`)
          .set('kbn-xsrf', 'xxxx')
          .send({ hosts: ['https://test.fr'] })
          .expect(200);

        const {
          body: { item: output },
        } = await supertest.get(`/api/fleet/outputs/${defaultOutputId}`).expect(200);

        expect(output.hosts).to.eql(['https://test.fr:443']);
      });

      it('should allow to update a default ES output if keeping it ES', async function () {
        await supertest
          .put(`/api/fleet/outputs/${defaultOutputId}/elasticsearch`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Updated Default ES Output',
            hosts: ['test.fr:443'],
          })
          .expect(200);
      });

      it('should return a 404 when updating a non existing output', async function () {
        await supertest
          .put(`/api/fleet/outputs/idonotexists`)
          .set('kbn-xsrf', 'xxxx')
          .send({ hosts: ['https://test.fr'] })
          .expect(404);
      });

      it('should not allow to update a default ES output to logstash', async function () {
        const { body } = await supertest
          .put(`/api/fleet/outputs/${defaultOutputId}/logstash`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'My Logstash Output',
            hosts: ['test.fr:443'],
            ssl: {
              certificate: 'CERTIFICATE',
              key: 'KEY',
              certificate_authorities: ['CA1', 'CA2'],
            },
          })
          .expect(400);
        expect(body.message).to.eql(
          'Logstash output cannot be used with Fleet Server integration in Fleet Server policy 1. Please create a new ElasticSearch output.'
        );
      });

      it('should discard the shipper values when shipper is disabled', async function () {
        await supertest
          .put(`/api/fleet/outputs/${defaultOutputId}/elasticsearch`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'default monitoring output 1',
            hosts: ['https://test.fr'],
            is_default_monitoring: true,
            shipper: {
              disk_queue_enabled: true,
              disk_queue_path: 'path/to/disk/queue',
              disk_queue_encryption_enabled: true,
            },
          })
          .expect(200);
        const {
          body: { items: outputs },
        } = await supertest.get(`/api/fleet/outputs`).expect(200);
        const newOutput = outputs.filter((o: any) => o.id === defaultOutputId);
        expect(newOutput[0].shipper).to.equal(null);
      });
    });

    describe('POST /outputs/elasticsearch', () => {
      it('should allow to create an ES output ', async function () {
        const { body: postResponse } = await supertest
          .post(`/api/fleet/outputs/elasticsearch`)
          .set('kbn-xsrf', 'xxxx')
          .send({ name: 'My output', hosts: ['https://test.fr'] })
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

      it('should allow to create a new default ES output ', async function () {
        const { body: postResponse } = await supertest
          .post(`/api/fleet/outputs/elasticsearch`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Default ES output',
            hosts: ['https://test.fr'],
            is_default: true,
          })
          .expect(200);

        const { id: _, ...itemWithoutId } = postResponse.item;
        expect(itemWithoutId).to.eql({
          name: 'Default ES output',
          type: 'elasticsearch',
          hosts: ['https://test.fr:443'],
          is_default: true,
          is_default_monitoring: false,
        });
      });

      it('should toggle the default output when creating a new one', async function () {
        await supertest
          .post(`/api/fleet/outputs/elasticsearch`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'default output 1',
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
          .post(`/api/fleet/outputs/elasticsearch`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'default monitoring output 1',
            hosts: ['https://test.fr'],
            is_default_monitoring: true,
          })
          .expect(200);

        const {
          body: { item: output2 },
        } = await supertest
          .post(`/api/fleet/outputs/elasticsearch`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'default monitoring output 2',
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

      it('should allow to create an ES output with the shipper values when shipper is enabled', async function () {
        await supertest
          .post(`/api/fleet/outputs/elasticsearch`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'output 1',
            hosts: ['https://test.fr'],
            is_default_monitoring: true,
            config_yaml: 'shipper: {}',
            shipper: {
              disk_queue_enabled: true,
              disk_queue_path: 'path/to/disk/queue',
              disk_queue_encryption_enabled: true,
            },
          })
          .expect(200);
        const {
          body: { items: outputs },
        } = await supertest.get(`/api/fleet/outputs`).expect(200);
        const newOutput = outputs.filter((o: any) => o.name === 'output 1');
        expect(newOutput[0].shipper).to.eql({
          compression_level: null,
          disk_queue_compression_enabled: null,
          disk_queue_enabled: true,
          disk_queue_encryption_enabled: true,
          disk_queue_max_size: null,
          disk_queue_path: 'path/to/disk/queue',
          loadbalance: null,
          max_batch_bytes: null,
          mem_queue_events: null,
          queue_flush_timeout: null,
        });
      });

      it('should discard the shipper values when shipper is disabled', async function () {
        await supertest
          .post(`/api/fleet/outputs/elasticsearch`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'default monitoring output 1',
            hosts: ['https://test.fr'],
            is_default_monitoring: true,
            shipper: {
              disk_queue_enabled: true,
              disk_queue_path: 'path/to/disk/queue',
              disk_queue_encryption_enabled: true,
            },
          })
          .expect(200);
        const {
          body: { items: outputs },
        } = await supertest.get(`/api/fleet/outputs`).expect(200);
        const defaultOutputs = outputs.filter((o: any) => o.is_default_monitoring);
        expect(defaultOutputs[0].shipper).to.equal(null);
      });

      it('should discard the shipper values when shipper is disabled', async function () {
        await supertest
          .post(`/api/fleet/outputs/elasticsearch`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'default monitoring output 1',
            hosts: ['https://test.fr'],
            is_default_monitoring: true,
            shipper: {
              disk_queue_enabled: true,
              disk_queue_path: 'path/to/disk/queue',
              disk_queue_encryption_enabled: true,
            },
          })
          .expect(200);
        const {
          body: { items: outputs },
        } = await supertest.get(`/api/fleet/outputs`).expect(200);
        const defaultOutputs = outputs.filter((o: any) => o.is_default_monitoring);
        expect(defaultOutputs[0].shipper).to.equal(null);
      });
    });
  });
}
