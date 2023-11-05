/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import { TransformGetTransformStatsTransformStats } from '@elastic/elasticsearch/lib/api/types';
import {
  ENDPOINT_DEFAULT_SORT_DIRECTION,
  ENDPOINT_DEFAULT_SORT_FIELD,
  HOST_METADATA_LIST_ROUTE,
  METADATA_DATASTREAM,
  METADATA_TRANSFORMS_STATUS_ROUTE,
  METADATA_UNITED_INDEX,
  METADATA_UNITED_TRANSFORM,
  METADATA_UNITED_TRANSFORM_V2,
  metadataTransformPrefix,
  METADATA_CURRENT_TRANSFORM_V2,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import { indexFleetEndpointPolicy } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { TRANSFORM_STATES } from '@kbn/security-solution-plugin/common/constants';
import type { IndexedHostsAndAlertsResponse } from '@kbn/security-solution-plugin/common/endpoint/index_data';

import {
  EndpointSortableField,
  MetadataListResponse,
} from '@kbn/security-solution-plugin/common/endpoint/types';
import { generateAgentDocs, generateMetadataDocs } from './metadata.fixtures';
import {
  bulkIndex,
  deleteAllDocsFromFleetAgents,
  deleteAllDocsFromIndex,
  deleteAllDocsFromMetadataCurrentIndex,
  deleteAllDocsFromMetadataDatastream,
  startTransform,
  stopTransform,
} from './data_stream_helper';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const endpointTestResources = getService('endpointTestResources');
  const log = getService('log');

  // Failing: See https://github.com/elastic/kibana/issues/151854
  describe.skip('test metadata apis', () => {
    describe('list endpoints GET route', () => {
      const numberOfHostsInFixture = 2;
      let agent1Timestamp: number;
      let agent2Timestamp: number;
      let metadataTimestamp: number;

      before(async () => {
        await deleteAllDocsFromFleetAgents(getService);
        await deleteAllDocsFromMetadataDatastream(getService);
        await deleteAllDocsFromMetadataCurrentIndex(getService);
        try {
          await deleteAllDocsFromIndex(getService, METADATA_UNITED_INDEX);
        } catch (err) {
          log.warning(`Unable to delete index: ${err}`);
        }

        const customIndexFn = async (): Promise<IndexedHostsAndAlertsResponse> => {
          // generate an endpoint policy and attach id to agents since
          // metadata list api filters down to endpoint policies only
          const policy = await indexFleetEndpointPolicy(
            getService('kibanaServer'),
            `Default ${uuidv4()}`,
            '1.1.1'
          );
          const policyId = policy.integrationPolicies[0].policy_id;
          agent1Timestamp = new Date().getTime();
          agent2Timestamp = agent1Timestamp + 33;
          metadataTimestamp = agent1Timestamp + 666;

          const agentDocs = generateAgentDocs([agent1Timestamp, agent2Timestamp], policyId);
          const metadataDocs = generateMetadataDocs(metadataTimestamp);

          await Promise.all([
            bulkIndex(getService, AGENTS_INDEX, agentDocs),
            bulkIndex(getService, METADATA_DATASTREAM, metadataDocs),
          ]);

          return {
            agents: agentDocs,
            hosts: metadataDocs,
          } as unknown as IndexedHostsAndAlertsResponse;
        };

        await endpointTestResources.loadEndpointData({ customIndexFn });
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
          .set('Elastic-Api-Version', '2023-10-31')
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
          .set('Elastic-Api-Version', '2023-10-31')
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
          .set('Elastic-Api-Version', '2023-10-31')
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
          .set('Elastic-Api-Version', '2023-10-31')
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
          .set('Elastic-Api-Version', '2023-10-31')
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
          .set('Elastic-Api-Version', '2023-10-31')
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
          .set('Elastic-Api-Version', '2023-10-31')
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
          .set('Elastic-Api-Version', '2023-10-31')
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
          .set('Elastic-Api-Version', '2023-10-31')
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
          .set('Elastic-Api-Version', '2023-10-31')
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

      it('metadata api should return the endpoint based on the agent hostname', async () => {
        const targetEndpointId = 'fc0ff548-feba-41b6-8367-65e8790d0eaf';
        const targetAgentHostname = 'Example-host-name-XYZ';
        const { body } = await supertest
          .get(HOST_METADATA_LIST_ROUTE)
          .set('kbn-xsrf', 'xxx')
          .set('Elastic-Api-Version', '2023-10-31')
          .query({
            kuery: `united.endpoint.host.hostname:${targetAgentHostname}`,
          })
          .expect(200);
        expect(body.total).to.eql(1);
        const resultHostId: string = body.data[0].metadata.host.id;
        const resultElasticAgentName: string = body.data[0].metadata.host.hostname;
        expect(resultHostId).to.eql(targetEndpointId);
        expect(resultElasticAgentName).to.eql(targetAgentHostname);
        expect(body.data.length).to.eql(1);
        expect(body.page).to.eql(0);
        expect(body.pageSize).to.eql(10);
      });

      it('metadata api should return all hosts when filter is empty string', async () => {
        const { body } = await supertest
          .get(HOST_METADATA_LIST_ROUTE)
          .set('kbn-xsrf', 'xxx')
          .set('Elastic-Api-Version', '2023-10-31')
          .expect(200);
        expect(body.data.length).to.eql(numberOfHostsInFixture);
        expect(body.total).to.eql(numberOfHostsInFixture);
        expect(body.page).to.eql(0);
        expect(body.pageSize).to.eql(10);
      });

      describe('`last_checkin` runtime field', () => {
        it('should sort based on `last_checkin` - because it is a runtime field', async () => {
          const { body: bodyAsc }: { body: MetadataListResponse } = await supertest
            .get(HOST_METADATA_LIST_ROUTE)
            .set('kbn-xsrf', 'xxx')
            .set('Elastic-Api-Version', '2023-10-31')
            .query({
              sortField: 'last_checkin',
              sortDirection: 'asc',
            })
            .expect(200);

          expect(bodyAsc.data[0].last_checkin).to.eql(new Date(agent1Timestamp).toISOString());
          expect(bodyAsc.data[1].last_checkin).to.eql(new Date(agent2Timestamp).toISOString());

          const { body: bodyDesc }: { body: MetadataListResponse } = await supertest
            .get(HOST_METADATA_LIST_ROUTE)
            .set('kbn-xsrf', 'xxx')
            .set('Elastic-Api-Version', '2023-10-31')
            .query({
              sortField: 'last_checkin',
              sortDirection: 'desc',
            })
            .expect(200);

          expect(bodyDesc.data[0].last_checkin).to.eql(new Date(agent2Timestamp).toISOString());
          expect(bodyDesc.data[1].last_checkin).to.eql(new Date(agent1Timestamp).toISOString());
        });
      });

      describe('sorting', () => {
        it('metadata api should return 400 with not supported sorting field', async () => {
          await supertest
            .get(HOST_METADATA_LIST_ROUTE)
            .set('kbn-xsrf', 'xxx')
            .set('Elastic-Api-Version', '2023-10-31')
            .query({
              sortField: 'abc',
            })
            .expect(400);
        });

        it('metadata api should sort by enrollment date by default', async () => {
          const { body }: { body: MetadataListResponse } = await supertest
            .get(HOST_METADATA_LIST_ROUTE)
            .set('kbn-xsrf', 'xxx')
            .set('Elastic-Api-Version', '2023-10-31')
            .expect(200);

          expect(body.sortDirection).to.eql(ENDPOINT_DEFAULT_SORT_DIRECTION);
          expect(body.sortField).to.eql(ENDPOINT_DEFAULT_SORT_FIELD);
        });

        for (const field of Object.values(EndpointSortableField)) {
          it(`metadata api should be able to sort by ${field}`, async () => {
            let body: MetadataListResponse;

            ({ body } = await supertest
              .get(HOST_METADATA_LIST_ROUTE)
              .set('kbn-xsrf', 'xxx')
              .set('Elastic-Api-Version', '2023-10-31')
              .query({
                sortField: field,
                sortDirection: 'asc',
              })
              .expect(200));

            expect(body.sortDirection).to.eql('asc');
            expect(body.sortField).to.eql(field);

            ({ body } = await supertest
              .get(HOST_METADATA_LIST_ROUTE)
              .set('kbn-xsrf', 'xxx')
              .set('Elastic-Api-Version', '2023-10-31')
              .query({
                sortField: field,
                sortDirection: 'desc',
              })
              .expect(200));

            expect(body.sortDirection).to.eql('desc');
            expect(body.sortField).to.eql(field);
          });
        }
      });
    });

    describe('get metadata transforms', () => {
      const testRegex = /(endpoint|logs-endpoint)\.metadata_(united|current)-default-*/;
      let currentTransformName = metadataTransformPrefix;
      let unitedTransformName = METADATA_UNITED_TRANSFORM;

      before(async () => {
        const isPackageV2 = await endpointTestResources.isEndpointPackageV2();
        if (isPackageV2) {
          currentTransformName = METADATA_CURRENT_TRANSFORM_V2;
          unitedTransformName = METADATA_UNITED_TRANSFORM_V2;
        }
      });

      it('should respond forbidden if no fleet access', async () => {
        await getService('supertestWithoutAuth')
          .get(METADATA_TRANSFORMS_STATUS_ROUTE)
          .set('kbn-xsrf', 'xxx')
          .set('Elastic-Api-Version', '2023-10-31')
          .expect(401);
      });

      it('correctly returns stopped transform stats', async () => {
        await stopTransform(getService, `${currentTransformName}*`);
        await stopTransform(getService, `${unitedTransformName}*`);

        const { body } = await supertest
          .get(METADATA_TRANSFORMS_STATUS_ROUTE)
          .set('kbn-xsrf', 'xxx')
          .set('Elastic-Api-Version', '2023-10-31')
          .expect(200);

        const transforms = (body.transforms as TransformGetTransformStatsTransformStats[]).filter(
          (transform) =>
            testRegex.test(transform.id) && transform.state === TRANSFORM_STATES.STOPPED
        );

        expect(transforms.length).to.eql(2);

        const currentTransform = transforms.find((transform) =>
          transform.id.startsWith(currentTransformName)
        );
        expect(currentTransform).to.be.ok();

        const unitedTransform = transforms.find((transform) =>
          transform.id.startsWith(unitedTransformName)
        );
        expect(unitedTransform).to.be.ok();

        await startTransform(getService, currentTransformName);
        await startTransform(getService, unitedTransformName);
      });

      it('correctly returns started transform stats', async () => {
        const { body } = await supertest
          .get(METADATA_TRANSFORMS_STATUS_ROUTE)
          .set('kbn-xsrf', 'xxx')
          .set('Elastic-Api-Version', '2023-10-31')
          .expect(200);

        const transforms = (body.transforms as TransformGetTransformStatsTransformStats[]).filter(
          (transform) =>
            testRegex.test(transform.id) && transform.state === TRANSFORM_STATES.STARTED
        );

        expect(transforms.length).to.eql(2);

        const currentTransform = transforms.find((transform) =>
          transform.id.startsWith(currentTransformName)
        );
        expect(currentTransform).to.be.ok();

        const unitedTransform = transforms.find((transform) =>
          transform.id.startsWith(unitedTransformName)
        );
        expect(unitedTransform).to.be.ok();
      });
    });
  });
}
