/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../ftr_provider_context';
import { deleteMetadataCurrentStream, deleteMetadataStream } from './data_stream_helper';

/**
 * The number of host documents in the es archive.
 */
const numberOfHostsInFixture = 3;

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const esClient = getService('es');
  const transformId = 'endpoint_metadata_transform';
  describe('test metadata api', () => {
    describe.skip('POST /api/endpoint/metadata when index is empty', () => {
      it('metadata api should return empty result when index is empty', async () => {
        // the endpoint uses data streams and es archiver does not support deleting them at the moment so we need
        // to do it manually
        await deleteMetadataStream(getService);
        await deleteMetadataCurrentStream(getService);
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200);
        expect(body.total.value).to.eql(0);
        expect(body.hosts.length).to.eql(0);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });
    });

    describe('POST /api/endpoint/metadata when index is not empty', () => {
      before(async () => {
        await esArchiver.load('endpoint/metadata/api_feature', { useCreate: true });
        await esClient.transform.putTransform({
          transform_id: transformId,
          defer_validation: false,
          body: {
            source: {
              index: 'metrics-endpoint.metadata-default',
            },
            dest: {
              index: 'metrics-endpoint.metadata_current-default',
            },
            pivot: {
              group_by: {
                'agent.id': {
                  terms: {
                    field: 'agent.id',
                  },
                },
              },
              aggregations: {
                HostDetails: {
                  scripted_metric: {
                    init_script: '',
                    map_script: "state.doc = new HashMap(params['_source'])",
                    combine_script: 'return state',
                    reduce_script:
                      "def all_docs = []; for (s in states) {     all_docs.add(s.doc); }  all_docs.sort((HashMap o1, HashMap o2)->o1['@timestamp'].millis.compareTo(o2['@timestamp'].millis)); def size = all_docs.size(); return all_docs[size-1];",
                  },
                },
              },
            },
            description: 'collapse and update the latest document for each host',
            frequency: '1m',
            sync: {
              time: {
                field: 'event.created',
                delay: '60s',
              },
            },
          },
        });

        await esClient.transform.startTransform({
          transform_id: transformId,
          timeout: '60s',
        });

        // wait for transform to apply
        await new Promise((r) => setTimeout(r, 70000));
        await esClient.transform.getTransformStats({
          transform_id: transformId,
        });
      });
      // the endpoint uses data streams and es archiver does not support deleting them at the moment so we need
      // to do it manually
      after(async () => {
        await esClient.transform.deleteTransform({
          transform_id: transformId,
          force: true,
        });

        await deleteMetadataStream(getService);
        await deleteMetadataCurrentStream(getService);
      });
      it('metadata api should return one entry for each host with default paging', async () => {
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200);
        expect(body.total).to.eql(numberOfHostsInFixture);
        expect(body.hosts.length).to.eql(numberOfHostsInFixture);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });

      it('metadata api should return page based on paging properties passed.', async () => {
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .send({
            paging_properties: [
              {
                page_size: 1,
              },
              {
                page_index: 1,
              },
            ],
          })
          .expect(200);
        expect(body.total).to.eql(numberOfHostsInFixture);
        expect(body.hosts.length).to.eql(1);
        expect(body.request_page_size).to.eql(1);
        expect(body.request_page_index).to.eql(1);
      });

      /* test that when paging properties produces no result, the total should reflect the actual number of metadata
      in the index.
       */
      it('metadata api should return accurate total metadata if page index produces no result', async () => {
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .send({
            paging_properties: [
              {
                page_size: 10,
              },
              {
                page_index: 3,
              },
            ],
          })
          .expect(200);
        expect(body.total).to.eql(numberOfHostsInFixture);
        expect(body.hosts.length).to.eql(0);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(30);
      });

      it('metadata api should return 400 when pagingProperties is below boundaries.', async () => {
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .send({
            paging_properties: [
              {
                page_size: 0,
              },
              {
                page_index: 1,
              },
            ],
          })
          .expect(400);
        expect(body.message).to.contain('Value must be equal to or greater than [1]');
      });

      it('metadata api should return page based on filters passed.', async () => {
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .send({
            filters: {
              kql: 'not HostDetails.host.ip:10.46.229.234',
            },
          })
          .expect(200);
        expect(body.total).to.eql(2);
        expect(body.hosts.length).to.eql(2);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });

      it('metadata api should return page based on filters and paging passed.', async () => {
        const notIncludedIp = '10.46.229.234';
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .send({
            paging_properties: [
              {
                page_size: 10,
              },
              {
                page_index: 0,
              },
            ],
            filters: {
              kql: `not HostDetails.host.ip:${notIncludedIp}`,
            },
          })
          .expect(200);
        expect(body.total).to.eql(2);
        const resultIps: string[] = [].concat(
          ...body.hosts.map((hostInfo: Record<string, any>) => hostInfo.metadata.host.ip)
        );
        expect(resultIps.sort()).to.eql(
          [
            '10.192.213.130',
            '10.70.28.129',
            '10.101.149.26',
            '2606:a000:ffc0:39:11ef:37b9:3371:578c',
          ].sort()
        );
        expect(resultIps).not.include.eql(notIncludedIp);
        expect(body.hosts.length).to.eql(2);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });

      it('metadata api should return page based on host.os.Ext.variant filter.', async () => {
        const variantValue = 'Windows Server 2012';
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .send({
            filters: {
              kql: `HostDetails.host.os.Ext.variant:${variantValue}`,
            },
          })
          .expect(200);
        expect(body.total).to.eql(1);
        const resultOsVariantValue: Set<string> = new Set(
          body.hosts.map((hostInfo: Record<string, any>) => hostInfo.metadata.host.os.Ext.variant)
        );
        expect(Array.from(resultOsVariantValue)).to.eql([variantValue]);
        expect(body.hosts.length).to.eql(1);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });

      it('metadata api should return the latest event for all the events for an endpoint', async () => {
        const targetEndpointIp = '10.46.229.234';
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .send({
            filters: {
              kql: `HostDetails.host.ip:${targetEndpointIp}`,
            },
          })
          .expect(200);
        expect(body.total).to.eql(1);
        const resultIp: string = body.hosts[0].metadata.host.ip.filter(
          (ip: string) => ip === targetEndpointIp
        );
        expect(resultIp).to.eql([targetEndpointIp]);
        // expect(body.hosts[0].metadata.event.created).to.eql(1579881969541);
        expect(body.hosts.length).to.eql(1);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });

      it('metadata api should return the latest event for all the events where policy status is not success', async () => {
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .send({
            filters: {
              kql: `not HostDetails.Endpoint.policy.applied.status:success`,
            },
          })
          .expect(200);
        const statuses: Set<string> = new Set(
          body.hosts.map(
            (hostInfo: Record<string, any>) => hostInfo.metadata.Endpoint.policy.applied.status
          )
        );
        expect(statuses.size).to.eql(1);
        expect(Array.from(statuses)).to.eql(['failure']);
      });

      it('metadata api should return the endpoint based on the elastic agent id, and status should be error', async () => {
        const targetEndpointId = 'fc0ff548-feba-41b6-8367-65e8790d0eaf';
        const targetElasticAgentId = '023fa40c-411d-4188-a941-4147bfadd095';
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .send({
            filters: {
              kql: `HostDetails.elastic.agent.id:${targetElasticAgentId}`,
            },
          })
          .expect(200);
        expect(body.total).to.eql(1);
        const resultHostId: string = body.hosts[0].metadata.host.id;
        const resultElasticAgentId: string = body.hosts[0].metadata.elastic.agent.id;
        expect(resultHostId).to.eql(targetEndpointId);
        expect(resultElasticAgentId).to.eql(targetElasticAgentId);
        // expect(body.hosts[0].metadata.event.created).to.eql(1579881969541);
        expect(body.hosts[0].host_status).to.eql('error');
        expect(body.hosts.length).to.eql(1);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });

      it('metadata api should return all hosts when filter is empty string', async () => {
        const { body } = await supertest
          .post('/api/endpoint/metadata')
          .set('kbn-xsrf', 'xxx')
          .send({
            filters: {
              kql: '',
            },
          })
          .expect(200);
        expect(body.total).to.eql(numberOfHostsInFixture);
        expect(body.hosts.length).to.eql(numberOfHostsInFixture);
        expect(body.request_page_size).to.eql(10);
        expect(body.request_page_index).to.eql(0);
      });
    });
  });
}
