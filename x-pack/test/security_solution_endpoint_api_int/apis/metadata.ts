/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import expect from '@kbn/expect';
import { TransformGetTransformStatsTransformStats } from '@elastic/elasticsearch/lib/api/types';
import { FtrProviderContext } from '../ftr_provider_context';
import {
  deleteAllDocsFromMetadataCurrentIndex,
  deleteAllDocsFromMetadataDatastream,
  deleteMetadataStream,
  deleteIndex,
  stopTransform,
  startTransform,
  deleteAllDocsFromFleetAgents,
  deleteAllDocsFromIndex,
  bulkIndex,
} from './data_stream_helper';
import {
  METADATA_DATASTREAM,
  HOST_METADATA_LIST_ROUTE,
  METADATA_UNITED_INDEX,
  METADATA_UNITED_TRANSFORM,
  METADATA_TRANSFORMS_STATUS_ROUTE,
  metadataTransformPrefix,
} from '../../../plugins/security_solution/common/endpoint/constants';
import { AGENTS_INDEX } from '../../../plugins/fleet/common';
import { generateAgentDocs, generateMetadataDocs } from './metadata.fixtures';
import { indexFleetEndpointPolicy } from '../../../plugins/security_solution/common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { TRANSFORM_STATES } from '../../../plugins/security_solution/common/constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const endpointTestResources = getService('endpointTestResources');

  describe('test metadata apis', () => {
    before(async () => {
      await endpointTestResources.setMetadataTransformFrequency('1s');
    });

    describe('list endpoints GET route', () => {
      describe('with .metrics-endpoint.metadata_united_default index', () => {
        const numberOfHostsInFixture = 2;

        before(async () => {
          await stopTransform(getService, `${METADATA_UNITED_TRANSFORM}*`);
          await deleteAllDocsFromFleetAgents(getService);
          await deleteAllDocsFromMetadataDatastream(getService);
          await deleteAllDocsFromMetadataCurrentIndex(getService);
          await deleteAllDocsFromIndex(getService, METADATA_UNITED_INDEX);

          // generate an endpoint policy and attach id to agents since
          // metadata list api filters down to endpoint policies only
          const policy = await indexFleetEndpointPolicy(
            getService('kibanaServer'),
            `Default ${uuid.v4()}`,
            '1.1.1'
          );
          const policyId = policy.integrationPolicies[0].policy_id;
          const currentTime = new Date().getTime();

          const agentDocs = generateAgentDocs(currentTime, policyId);

          await Promise.all([
            bulkIndex(getService, AGENTS_INDEX, agentDocs),
            bulkIndex(getService, METADATA_DATASTREAM, generateMetadataDocs(currentTime)),
          ]);

          await endpointTestResources.waitForEndpoints(
            agentDocs.map((doc) => doc.agent.id),
            60000
          );
          await startTransform(getService, METADATA_UNITED_TRANSFORM);
          await endpointTestResources.waitForUnitedEndpoints(
            agentDocs.map((doc) => doc.agent.id),
            60000
          );
        });

        after(async () => {
          await deleteAllDocsFromFleetAgents(getService);
          await deleteAllDocsFromMetadataDatastream(getService);
          await deleteAllDocsFromMetadataCurrentIndex(getService);
          await deleteAllDocsFromIndex(getService, METADATA_UNITED_INDEX);
        });

        it('should return one entry for each host with default paging', async () => {
          const res = await supertest
            .get(HOST_METADATA_LIST_ROUTE)
            .set('kbn-xsrf', 'xxx')
            .query({
              page: 0,
              pageSize: 10,
            })
            .expect(200);
          const { body } = res;
          expect(body.data.length).to.eql(numberOfHostsInFixture);
          expect(body.total).to.eql(numberOfHostsInFixture);
          expect(body.page).to.eql(0);
          expect(body.pageSize).to.eql(10);
        });

        it('metadata api should return page based on paging properties passed', async () => {
          const { body } = await supertest
            .get(HOST_METADATA_LIST_ROUTE)
            .set('kbn-xsrf', 'xxx')
            .query({
              page: 1,
              pageSize: 1,
            })
            .expect(200);
          expect(body.data.length).to.eql(1);
          expect(body.total).to.eql(numberOfHostsInFixture);
          expect(body.page).to.eql(1);
          expect(body.pageSize).to.eql(1);
        });

        it('metadata api should return accurate total metadata if page index produces no result', async () => {
          const { body } = await supertest
            .get(HOST_METADATA_LIST_ROUTE)
            .set('kbn-xsrf', 'xxx')
            .query({
              page: 3,
              pageSize: 10,
            })
            .expect(200);
          expect(body.data.length).to.eql(0);
          expect(body.total).to.eql(numberOfHostsInFixture);
          expect(body.page).to.eql(3);
          expect(body.pageSize).to.eql(10);
        });

        it('metadata api should return 400 when pagingProperties is below boundaries.', async () => {
          const { body } = await supertest
            .get(HOST_METADATA_LIST_ROUTE)
            .set('kbn-xsrf', 'xxx')
            .query({
              page: 1,
              pageSize: 0,
            })
            .expect(400);
          expect(body.message).to.contain('Value must be equal to or greater than [1]');
        });

        it('metadata api should return page based on filters passed.', async () => {
          const { body } = await supertest
            .get(HOST_METADATA_LIST_ROUTE)
            .set('kbn-xsrf', 'xxx')
            .query({
              kuery: 'not (united.endpoint.host.ip:10.101.149.26)',
            })
            .expect(200);
          expect(body.data.length).to.eql(1);
          expect(body.total).to.eql(1);
          expect(body.page).to.eql(0);
          expect(body.pageSize).to.eql(10);
        });

        it('metadata api should return page based on filters and paging passed.', async () => {
          const notIncludedIp = '10.101.149.26';
          const { body } = await supertest
            .get(HOST_METADATA_LIST_ROUTE)
            .set('kbn-xsrf', 'xxx')
            .query({
              page: 0,
              pageSize: 10,
              kuery: `not (united.endpoint.host.ip:${notIncludedIp})`,
            })
            .expect(200);
          expect(body.total).to.eql(1);
          const resultIps: string[] = [].concat(
            ...body.data.map((hostInfo: Record<string, any>) => hostInfo.metadata.host.ip)
          );
          expect(resultIps.sort()).to.eql(['10.192.213.130', '10.70.28.129'].sort());
          expect(resultIps).not.include.eql(notIncludedIp);
          expect(body.data.length).to.eql(1);
          expect(body.page).to.eql(0);
          expect(body.pageSize).to.eql(10);
        });

        it('metadata api should return page based on host.os.Ext.variant filter.', async () => {
          const variantValue = 'Windows Pro';
          const { body } = await supertest
            .get(HOST_METADATA_LIST_ROUTE)
            .set('kbn-xsrf', 'xxx')
            .query({
              kuery: `united.endpoint.host.os.Ext.variant:${variantValue}`,
            })
            .expect(200);
          expect(body.total).to.eql(2);
          const resultOsVariantValue: Set<string> = new Set(
            body.data.map((hostInfo: Record<string, any>) => hostInfo.metadata.host.os.Ext.variant)
          );
          expect(Array.from(resultOsVariantValue)).to.eql([variantValue]);
          expect(body.data.length).to.eql(2);
          expect(body.page).to.eql(0);
          expect(body.pageSize).to.eql(10);
        });

        it('metadata api should return the latest event for all the events for an endpoint', async () => {
          const targetEndpointIp = '10.101.149.26';
          const { body } = await supertest
            .get(HOST_METADATA_LIST_ROUTE)
            .set('kbn-xsrf', 'xxx')
            .query({
              kuery: `united.endpoint.host.ip:${targetEndpointIp}`,
            })
            .expect(200);
          expect(body.total).to.eql(1);
          const resultIp: string = body.data[0].metadata.host.ip.filter(
            (ip: string) => ip === targetEndpointIp
          );
          expect(resultIp).to.eql([targetEndpointIp]);
          expect(body.data.length).to.eql(1);
          expect(body.page).to.eql(0);
          expect(body.pageSize).to.eql(10);
        });

        it('metadata api should return the latest event for all the events where policy status is not success', async () => {
          const { body } = await supertest
            .get(HOST_METADATA_LIST_ROUTE)
            .set('kbn-xsrf', 'xxx')
            .query({
              kuery: 'not (united.endpoint.Endpoint.policy.applied.status:success)',
            })
            .expect(200);
          const statuses: Set<string> = new Set(
            body.data.map(
              (hostInfo: Record<string, any>) => hostInfo.metadata.Endpoint.policy.applied.status
            )
          );
          expect(statuses.size).to.eql(1);
          expect(Array.from(statuses)).to.eql(['failure']);
        });

        it('metadata api should return the endpoint based on the elastic agent id, and status should be healthy', async () => {
          const targetEndpointId = 'fc0ff548-feba-41b6-8367-65e8790d0eaf';
          const targetElasticAgentId = '023fa40c-411d-4188-a941-4147bfadd095';
          const { body } = await supertest
            .get(HOST_METADATA_LIST_ROUTE)
            .set('kbn-xsrf', 'xxx')
            .query({
              kuery: `united.endpoint.elastic.agent.id:${targetElasticAgentId}`,
            })
            .expect(200);
          expect(body.total).to.eql(1);
          const resultHostId: string = body.data[0].metadata.host.id;
          const resultElasticAgentId: string = body.data[0].metadata.elastic.agent.id;
          expect(resultHostId).to.eql(targetEndpointId);
          expect(resultElasticAgentId).to.eql(targetElasticAgentId);
          expect(body.data.length).to.eql(1);
          expect(body.data[0].host_status).to.eql('healthy');
          expect(body.page).to.eql(0);
          expect(body.pageSize).to.eql(10);
        });

        it('metadata api should return all hosts when filter is empty string', async () => {
          const { body } = await supertest
            .get(HOST_METADATA_LIST_ROUTE)
            .set('kbn-xsrf', 'xxx')
            .expect(200);
          expect(body.data.length).to.eql(numberOfHostsInFixture);
          expect(body.total).to.eql(numberOfHostsInFixture);
          expect(body.page).to.eql(0);
          expect(body.pageSize).to.eql(10);
        });
      });

      describe('with metrics-endpoint.metadata_current_default index', () => {
        /**
         * The number of host documents in the es archive.
         */
        const numberOfHostsInFixture = 3;

        describe('when index is empty', () => {
          it('metadata api should return empty result when index is empty', async () => {
            await stopTransform(getService, `${METADATA_UNITED_TRANSFORM}*`);
            await deleteIndex(getService, METADATA_UNITED_INDEX);
            await deleteMetadataStream(getService);
            await deleteAllDocsFromMetadataDatastream(getService);
            await deleteAllDocsFromMetadataCurrentIndex(getService);
            const { body } = await supertest
              .get(HOST_METADATA_LIST_ROUTE)
              .set('kbn-xsrf', 'xxx')
              .query({
                page: 0,
                pageSize: 10,
              })
              .expect(200);
            expect(body.data.length).to.eql(0);
            expect(body.total).to.eql(0);
            expect(body.page).to.eql(0);
            expect(body.pageSize).to.eql(10);
          });
        });

        describe('when index is not empty', () => {
          const timestamp = new Date().getTime();
          before(async () => {
            // stop the united transform and delete the index
            // otherwise it won't hit metrics-endpoint.metadata_current_default index
            await stopTransform(getService, `${METADATA_UNITED_TRANSFORM}*`);
            await deleteIndex(getService, METADATA_UNITED_INDEX);

            const metadataDocs = generateMetadataDocs(timestamp);
            await bulkIndex(getService, METADATA_DATASTREAM, metadataDocs);

            await endpointTestResources.waitForEndpoints(
              Array.from(new Set(metadataDocs.map((doc) => doc.agent.id))),
              60000
            );
          });
          // the endpoint uses data streams and es archiver does not support deleting them at the moment so we need
          // to do it manually
          after(async () => {
            await deleteMetadataStream(getService);
            await deleteAllDocsFromMetadataDatastream(getService);
            await deleteAllDocsFromMetadataCurrentIndex(getService);
          });

          it('metadata api should return one entry for each host with default paging', async () => {
            const { body } = await supertest
              .get(HOST_METADATA_LIST_ROUTE)
              .set('kbn-xsrf', 'xxx')
              .query({
                page: 0,
                pageSize: 10,
              })
              .expect(200);
            expect(body.data.length).to.eql(numberOfHostsInFixture);
            expect(body.total).to.eql(numberOfHostsInFixture);
            expect(body.page).to.eql(0);
            expect(body.pageSize).to.eql(10);
          });

          it('metadata api should return page based on paging properties passed.', async () => {
            const { body } = await supertest
              .get(HOST_METADATA_LIST_ROUTE)
              .set('kbn-xsrf', 'xxx')
              .query({
                page: 1,
                pageSize: 1,
              })
              .expect(200);
            expect(body.data.length).to.eql(1);
            expect(body.total).to.eql(numberOfHostsInFixture);
            expect(body.page).to.eql(1);
            expect(body.pageSize).to.eql(1);
          });

          /* test that when paging properties produces no result, the total should reflect the actual number of metadata
        in the index.
         */
          it('metadata api should return accurate total metadata if page index produces no result', async () => {
            const { body } = await supertest
              .get(HOST_METADATA_LIST_ROUTE)
              .set('kbn-xsrf', 'xxx')
              .query({
                page: 3,
                pageSize: 10,
              })
              .expect(200);
            expect(body.data.length).to.eql(0);
            expect(body.total).to.eql(numberOfHostsInFixture);
            expect(body.page).to.eql(3);
            expect(body.pageSize).to.eql(10);
          });

          it('metadata api should return 400 when pagingProperties is below boundaries.', async () => {
            const { body } = await supertest
              .get(HOST_METADATA_LIST_ROUTE)
              .set('kbn-xsrf', 'xxx')
              .query({
                page: 1,
                pageSize: 0,
              })
              .expect(400);
            expect(body.message).to.contain('Value must be equal to or greater than [1]');
          });

          it('metadata api should return page based on filters passed.', async () => {
            const { body } = await supertest
              .get(HOST_METADATA_LIST_ROUTE)
              .set('kbn-xsrf', 'xxx')
              .query({
                kuery: 'not (HostDetails.host.ip:10.46.229.234 or host.ip:10.46.229.234)',
              })
              .expect(200);
            expect(body.data.length).to.eql(2);
            expect(body.total).to.eql(2);
            expect(body.page).to.eql(0);
            expect(body.pageSize).to.eql(10);
          });

          it('metadata api should return page based on filters and paging passed.', async () => {
            const notIncludedIp = '10.46.229.234';
            const { body } = await supertest
              .get(HOST_METADATA_LIST_ROUTE)
              .set('kbn-xsrf', 'xxx')
              .query({
                page: 0,
                pageSize: 10,
                kuery: `not (HostDetails.host.ip:${notIncludedIp} or host.ip:${notIncludedIp})`,
              })
              .expect(200);
            expect(body.data.length).to.eql(2);
            expect(body.total).to.eql(2);
            const resultIps: string[] = [].concat(
              ...body.data.map((hostInfo: Record<string, any>) => hostInfo.metadata.host.ip)
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
            expect(body.page).to.eql(0);
            expect(body.pageSize).to.eql(10);
          });

          it('metadata api should return page based on host.os.Ext.variant filter.', async () => {
            const variantValue = 'Windows Pro';
            const { body } = await supertest
              .get(HOST_METADATA_LIST_ROUTE)
              .set('kbn-xsrf', 'xxx')
              .query({
                kuery: `HostDetails.host.os.Ext.variant:${variantValue} or host.os.Ext.variant:${variantValue}`,
              })
              .expect(200);
            expect(body.data.length).to.eql(2);
            expect(body.total).to.eql(2);
            const resultOsVariantValue: Set<string> = new Set(
              body.data.map(
                (hostInfo: Record<string, any>) => hostInfo.metadata.host.os.Ext.variant
              )
            );
            expect(Array.from(resultOsVariantValue)).to.eql([variantValue]);
            expect(body.page).to.eql(0);
            expect(body.pageSize).to.eql(10);
          });

          it('metadata api should return the latest event for all the events for an endpoint', async () => {
            const targetEndpointIp = '10.46.229.234';
            const { body } = await supertest
              .get(HOST_METADATA_LIST_ROUTE)
              .set('kbn-xsrf', 'xxx')
              .query({
                kuery: `HostDetails.host.ip:${targetEndpointIp} or host.ip:${targetEndpointIp}`,
              })
              .expect(200);
            expect(body.data.length).to.eql(1);
            expect(body.total).to.eql(1);
            const resultIp: string = body.data[0].metadata.host.ip.filter(
              (ip: string) => ip === targetEndpointIp
            );
            expect(resultIp).to.eql([targetEndpointIp]);
            expect(body.data[0].metadata.event.created).to.eql(timestamp);
            expect(body.page).to.eql(0);
            expect(body.pageSize).to.eql(10);
          });

          it('metadata api should return the latest event for all the events where policy status is not success', async () => {
            const { body } = await supertest
              .get(HOST_METADATA_LIST_ROUTE)
              .set('kbn-xsrf', 'xxx')
              .query({
                kuery:
                  'not (HostDetails.Endpoint.policy.applied.status:success or Endpoint.policy.applied.status:success)',
              })
              .expect(200);
            const statuses: Set<string> = new Set(
              body.data.map(
                (hostInfo: Record<string, any>) => hostInfo.metadata.Endpoint.policy.applied.status
              )
            );
            expect(statuses.size).to.eql(1);
            expect(Array.from(statuses)).to.eql(['failure']);
          });

          it('metadata api should return the endpoint based on the elastic agent id, and status should be unhealthy', async () => {
            const targetEndpointId = 'fc0ff548-feba-41b6-8367-65e8790d0eaf';
            const targetElasticAgentId = '023fa40c-411d-4188-a941-4147bfadd095';
            const { body } = await supertest
              .get(HOST_METADATA_LIST_ROUTE)
              .set('kbn-xsrf', 'xxx')
              .query({
                kuery: `HostDetails.elastic.agent.id:${targetElasticAgentId} or elastic.agent.id:${targetElasticAgentId}`,
              })
              .expect(200);
            expect(body.data.length).to.eql(1);
            expect(body.total).to.eql(1);
            const resultHostId: string = body.data[0].metadata.host.id;
            const resultElasticAgentId: string = body.data[0].metadata.elastic.agent.id;
            expect(resultHostId).to.eql(targetEndpointId);
            expect(resultElasticAgentId).to.eql(targetElasticAgentId);
            expect(body.data[0].metadata.event.created).to.eql(timestamp);
            expect(body.data[0].host_status).to.eql('unhealthy');
            expect(body.page).to.eql(0);
            expect(body.pageSize).to.eql(10);
          });

          it('metadata api should return all hosts when filter is empty string', async () => {
            const { body } = await supertest
              .get(HOST_METADATA_LIST_ROUTE)
              .set('kbn-xsrf', 'xxx')
              .query({
                kuery: '',
              })
              .expect(200);
            expect(body.data.length).to.eql(numberOfHostsInFixture);
            expect(body.total).to.eql(numberOfHostsInFixture);
            expect(body.page).to.eql(0);
            expect(body.pageSize).to.eql(10);
          });
        });
      });
    });

    describe('get metadata transforms', () => {
      it('should respond forbidden if no fleet access', async () => {
        await getService('supertestWithoutAuth')
          .get(METADATA_TRANSFORMS_STATUS_ROUTE)
          .set('kbn-xsrf', 'xxx')
          .expect(401);
      });

      it('correctly returns stopped transform stats', async () => {
        await stopTransform(getService, `${metadataTransformPrefix}*`);
        await stopTransform(getService, `${METADATA_UNITED_TRANSFORM}*`);

        const { body } = await supertest
          .get(METADATA_TRANSFORMS_STATUS_ROUTE)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(body.count).to.eql(2);

        const transforms: TransformGetTransformStatsTransformStats[] = body.transforms.sort(
          (
            a: TransformGetTransformStatsTransformStats,
            b: TransformGetTransformStatsTransformStats
          ) => a.id > b.id
        );

        expect(transforms[0].id).to.contain(metadataTransformPrefix);
        expect(transforms[0].state).to.eql(TRANSFORM_STATES.STOPPED);
        expect(transforms[1].id).to.contain(METADATA_UNITED_TRANSFORM);
        expect(transforms[1].state).to.eql(TRANSFORM_STATES.STOPPED);

        await startTransform(getService, metadataTransformPrefix);
        await startTransform(getService, METADATA_UNITED_TRANSFORM);
      });

      it('correctly returns started transform stats', async () => {
        const { body } = await supertest
          .get(METADATA_TRANSFORMS_STATUS_ROUTE)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(body.count).to.eql(2);

        const transforms: TransformGetTransformStatsTransformStats[] = body.transforms.sort(
          (
            a: TransformGetTransformStatsTransformStats,
            b: TransformGetTransformStatsTransformStats
          ) => a.id > b.id
        );

        expect(transforms[0].id).to.contain(metadataTransformPrefix);
        expect(transforms[0].state).to.eql(TRANSFORM_STATES.STARTED);
        expect(transforms[1].id).to.contain(METADATA_UNITED_TRANSFORM);
        expect(transforms[1].state).to.eql(TRANSFORM_STATES.STARTED);
      });
    });
  });
}
