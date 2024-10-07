/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import TestAgent from 'supertest/lib/agent';
import { ensureSpaceIdExists } from '@kbn/security-solution-plugin/scripts/endpoint/common/spaces';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import expect from '@kbn/expect';
import {
  AGENT_STATUS_ROUTE,
  BASE_POLICY_RESPONSE_ROUTE,
  HOST_METADATA_GET_ROUTE,
  HOST_METADATA_LIST_ROUTE,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const utils = getService('securitySolutionUtils');
  const endpointTestresources = getService('endpointTestResources');
  const kbnServer = getService('kibanaServer');
  const log = getService('log');

  describe('@ess @serverless Endpoint management space awareness support', function () {
    let adminSupertest: TestAgent;
    let dataSpaceA: Awaited<ReturnType<typeof endpointTestresources.loadEndpointData>>;
    let dataSpaceB: Awaited<ReturnType<typeof endpointTestresources.loadEndpointData>>;

    before(async () => {
      adminSupertest = await utils.createSuperTest();

      await Promise.all([
        ensureSpaceIdExists(kbnServer, 'space-a', { log }),
        ensureSpaceIdExists(kbnServer, 'space-b', { log }),
      ]);
      await Promise.all([
        endpointTestresources
          .loadEndpointData({ spaceId: 'space-a', generatorSeed: Math.random().toString(32) })
          .then((responseA) => {
            dataSpaceA = responseA;
          }),
        endpointTestresources
          .loadEndpointData({ spaceId: 'space-b', generatorSeed: Math.random().toString(32) })
          .then((responseB) => {
            dataSpaceB = responseB;
          }),
      ]);
    });

    // the endpoint uses data streams and es archiver does not support deleting them at the moment so we need
    // to do it manually
    after(async () => {
      if (dataSpaceA) {
        await dataSpaceA.unloadEndpointData();
        // @ts-expect-error
        dataSpaceA = undefined;
      }
      if (dataSpaceB) {
        await dataSpaceB.unloadEndpointData();
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
              'space-a',
              `/api/endpoint/policy_response?agentId=${dataSpaceA.hosts[0].agent.id}`
            )
          )
          .send()
          .expect(200);

        expect(body.policy_response.agent.id).to.eql(dataSpaceA.hosts[0].agent.id);
      });

      it('should return not found for a host policy response not in current space', async () => {
        await adminSupertest
          .get(
            addSpaceIdToPath(
              '/',
              'space-a',
              `/api/endpoint/policy_response?agentId=${dataSpaceB.hosts[0].agent.id}`
            )
          )
          .send()
          .expect(404);
      });
    });

    describe(`Host Metadata List API: ${HOST_METADATA_LIST_ROUTE}`, () => {
      // FIXME:PT implement
    });

    describe(`Host Details Metadata API: ${HOST_METADATA_GET_ROUTE}`, () => {
      // FIXME:PT implement
    });

    describe(`Agent Status API: ${AGENT_STATUS_ROUTE}`, () => {});
    // FIXME:PT implement
  });
}
