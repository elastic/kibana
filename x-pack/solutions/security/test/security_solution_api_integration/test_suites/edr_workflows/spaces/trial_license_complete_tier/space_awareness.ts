/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type TestAgent from 'supertest/lib/agent';
import { ensureSpaceIdExists } from '@kbn/security-solution-plugin/scripts/endpoint/common/spaces';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import expect from '@kbn/expect';
import {
  AGENT_STATUS_ROUTE,
  BASE_POLICY_RESPONSE_ROUTE,
  HOST_METADATA_GET_ROUTE,
  HOST_METADATA_LIST_ROUTE,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import { createSupertestErrorLogger } from '../../utils';
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const utils = getService('securitySolutionUtils');
  const endpointTestresources = getService('endpointTestResources');
  const kbnServer = getService('kibanaServer');
  const log = getService('log');

  // FLAKY: https://github.com/elastic/kibana/issues/247374
  describe.skip('@ess @serverless @skipInServerlessMKI Endpoint management space awareness support', function () {
    let adminSupertest: TestAgent;
    let dataSpaceA: Awaited<ReturnType<typeof endpointTestresources.loadEndpointData>>;
    let dataSpaceB: Awaited<ReturnType<typeof endpointTestresources.loadEndpointData>>;

    before(async () => {
      adminSupertest = await utils.createSuperTest();

      await Promise.all([
        ensureSpaceIdExists(kbnServer, 'space_a', { log }),
        ensureSpaceIdExists(kbnServer, 'space_b', { log }),
      ]);

      log.info(`Loading endpoint data into space_a`);

      dataSpaceA = await endpointTestresources.loadEndpointData({
        spaceId: 'space_a',
        generatorSeed: Math.random().toString(32),
      });

      log.info(`Done with loading of endpoint data into space_a

Loading endpoint data into space_b`);

      dataSpaceB = await endpointTestresources.loadEndpointData({
        spaceId: 'space_b',
        generatorSeed: Math.random().toString(32),
      });

      log.info(`Done with loading of endpoint data into space_b`);

      log.verbose(
        `mocked data loaded:\nSPACE A:\n${JSON.stringify(
          dataSpaceA,
          null,
          2
        )}\nSPACE B:\n${JSON.stringify(dataSpaceB, null, 2)}`
      );
    });

    after(async () => {
      // Delete data loaded and suppress any errors (no point in failing test suite on data
      // cleanup, since all test already ran)
      if (dataSpaceA) {
        await dataSpaceA.unloadEndpointData().catch((error) => {
          log.warning(`afterAll data clean up threw error: ${error.message}`);
          log.debug(error);
        });
        // @ts-expect-error
        dataSpaceA = undefined;
      }
      if (dataSpaceB) {
        await dataSpaceB.unloadEndpointData().catch((error) => {
          log.warning(`afterAll data clean up threw error: ${error.message}`);
          log.debug(error);
        });
        // @ts-expect-error
        dataSpaceB = undefined;
      }
    });

    describe(`Policy Response API: ${BASE_POLICY_RESPONSE_ROUTE}`, () => {
      it('should return policy response in space', async () => {
        const { body } = await adminSupertest
          .get(
            addSpaceIdToPath(
              '/',
              dataSpaceA.spaceId,
              `/api/endpoint/policy_response?agentId=${dataSpaceA.hosts[0].agent.id}`
            )
          )
          .on('error', createSupertestErrorLogger(log))
          .send()
          .expect(200);

        expect(body.policy_response.agent.id).to.eql(dataSpaceA.hosts[0].agent.id);
      });

      it('should return not found for a host policy response not in current space', async () => {
        await adminSupertest
          .get(
            addSpaceIdToPath(
              '/',
              dataSpaceA.spaceId,
              `/api/endpoint/policy_response?agentId=${dataSpaceB.hosts[0].agent.id}`
            )
          )
          .on('error', createSupertestErrorLogger(log).ignoreCodes([404]))
          .send()
          .expect(404);
      });
    });

    describe(`Host Metadata List API: ${HOST_METADATA_LIST_ROUTE}`, () => {
      it('should retrieve list with only metadata for hosts in current space', async () => {
        const { body } = await adminSupertest
          .get(addSpaceIdToPath('/', dataSpaceA.spaceId, HOST_METADATA_LIST_ROUTE))
          .on('error', createSupertestErrorLogger(log))
          .send()
          .expect(200);

        expect(body.total).to.eql(1);
        expect(body.data[0].metadata.agent.id).to.eql(dataSpaceA.hosts[0].agent.id);
      });

      it('should not return host data from other spaces when using kuery value', async () => {
        const { body } = await adminSupertest
          .get(addSpaceIdToPath('/', dataSpaceA.spaceId, HOST_METADATA_LIST_ROUTE))
          .on('error', createSupertestErrorLogger(log))
          .query({
            kuery: `united.endpoint.agent.id: "${dataSpaceB.hosts[0].agent.id}"`,
          })
          .send()
          .expect(200);

        expect(body.total).to.eql(0);
      });
    });

    describe(`Host Details Metadata API: ${HOST_METADATA_GET_ROUTE}`, () => {
      it('should retrieve metadata details for agent id in space', async () => {
        await adminSupertest
          .get(
            addSpaceIdToPath(
              '/',
              dataSpaceA.spaceId,
              HOST_METADATA_GET_ROUTE.replace('{id}', dataSpaceA.hosts[0].agent.id)
            )
          )
          .on('error', createSupertestErrorLogger(log))
          .send()
          .expect(200);
      });

      it('should NOT return metadata details for agent id that is not in current space', async () => {
        await adminSupertest
          .get(
            addSpaceIdToPath(
              '/',
              dataSpaceA.spaceId,
              HOST_METADATA_GET_ROUTE.replace('{id}', dataSpaceB.hosts[0].agent.id)
            )
          )
          .on('error', createSupertestErrorLogger(log).ignoreCodes([404]))
          .send()
          .expect(404);
      });
    });

    describe(`Agent Status API: ${AGENT_STATUS_ROUTE}`, () => {
      it('should return status for an agent in current space', async () => {
        const { body } = await adminSupertest
          .get(addSpaceIdToPath('/', dataSpaceA.spaceId, AGENT_STATUS_ROUTE))
          .query({ agentIds: [dataSpaceA.hosts[0].agent.id] })
          .set('elastic-api-version', '1')
          .set('x-elastic-internal-origin', 'kibana')
          .on('error', createSupertestErrorLogger(log))
          .send()
          .expect(200);

        expect(body.data[dataSpaceA.hosts[0].agent.id].found).to.eql(true);
      });

      it('should NOT return status for an agent that is not in current space', async () => {
        const { body } = await adminSupertest
          .get(addSpaceIdToPath('/', dataSpaceA.spaceId, AGENT_STATUS_ROUTE))
          .query({ agentIds: [dataSpaceB.hosts[0].agent.id] })
          .set('elastic-api-version', '1')
          .set('x-elastic-internal-origin', 'kibana')
          .on('error', createSupertestErrorLogger(log))
          .send()
          .expect(200);

        expect(body.data[dataSpaceB.hosts[0].agent.id].found).to.eql(false);
      });
    });
  });
}
