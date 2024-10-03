/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import TestAgent from 'supertest/lib/agent';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { ensureSpaceIdExists } from '@kbn/security-solution-plugin/scripts/endpoint/common/spaces';
import { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const utils = getService('securitySolutionUtils');
  const endpointTestresources = getService('endpointTestResources');
  const kbnServer = getService('kibanaServer');
  const log = getService('log');

  describe('@ess @serverless Endpoint policy response api', function () {
    let adminSupertest: TestAgent;

    before(async () => {
      adminSupertest = await utils.createSuperTest();
    });

    describe('GET /api/endpoint/policy_response', () => {
      let spaceAData: Awaited<ReturnType<typeof endpointTestresources.loadEndpointData>>;
      let spaceBData: Awaited<ReturnType<typeof endpointTestresources.loadEndpointData>>;

      before(async () => {
        await Promise.all([
          ensureSpaceIdExists(kbnServer, 'space-a', { log }),
          ensureSpaceIdExists(kbnServer, 'space-b', { log }),
        ]);
        spaceAData = await endpointTestresources.loadEndpointData({
          spaceId: 'space-a',
          generatorSeed: Math.random().toString(32),
        });
        spaceBData = await endpointTestresources.loadEndpointData({
          spaceId: 'space-b',
          generatorSeed: Math.random().toString(32),
        });
      });

      // the endpoint uses data streams and es archiver does not support deleting them at the moment so we need
      // to do it manually
      after(async () => {
        if (spaceAData) {
          await spaceAData.unloadEndpointData();
          // @ts-expect-error
          spaceAData = undefined;
        }
        if (spaceBData) {
          await spaceBData.unloadEndpointData();
          // @ts-expect-error
          spaceBData = undefined;
        }
      });

      it('should return policy response in space', async () => {
        const expectedAgentId = spaceAData.hosts[0].agent.id;
        const { body } = await adminSupertest
          .get(
            addSpaceIdToPath(
              '/',
              'space-a',
              `/api/endpoint/policy_response?agentId=${expectedAgentId}`
            )
          )
          .send()
          .expect(200);

        expect(body.policy_response.agent.id).to.eql(expectedAgentId);
        expect(body.policy_response.Endpoint.policy).to.not.be(undefined);
      });

      it('should return not found for a policy response not in current space', async () => {
        await adminSupertest
          .get(
            addSpaceIdToPath(
              '/',
              'space-a',
              `/api/endpoint/policy_response?agentId=${spaceAData.hosts[0].agent.id}`
            )
          )
          .send()
          .expect(404);
      });
    });
  });
}
