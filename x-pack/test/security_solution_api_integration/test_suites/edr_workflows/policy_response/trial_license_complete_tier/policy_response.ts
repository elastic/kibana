/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import TestAgent from 'supertest/lib/agent';
import { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function ({ getService }: FtrProviderContext) {
  const utils = getService('securitySolutionUtils');
  const endpointTestresources = getService('endpointTestResources');

  describe('@ess @serverless @skipInServerlessMKI Endpoint policy response api', function () {
    let adminSupertest: TestAgent;

    before(async () => {
      adminSupertest = await utils.createSuperTest();
    });

    describe('GET /api/endpoint/policy_response', () => {
      let mockData: Awaited<ReturnType<typeof endpointTestresources.loadEndpointData>>;

      before(async () => {
        mockData = await endpointTestresources.loadEndpointData();
      });

      // the endpoint uses data streams and es archiver does not support deleting them at the moment so we need
      // to do it manually
      after(async () => {
        if (mockData) {
          await endpointTestresources.unloadEndpointData(mockData);
          // @ts-expect-error
          mockData = undefined;
        }
      });

      it('should return one policy response for an id', async () => {
        const expectedAgentId = mockData.hosts[0].agent.id;
        const { body } = await adminSupertest
          .get(`/api/endpoint/policy_response?agentId=${expectedAgentId}`)
          .send()
          .expect(200);

        expect(body.policy_response.agent.id).to.eql(expectedAgentId);
        expect(body.policy_response.Endpoint.policy).to.not.be(undefined);
      });

      it('should return not found if host has no policy response', async () => {
        const { body } = await adminSupertest
          .get(`/api/endpoint/policy_response?agentId=bad_id`)
          .send()
          .expect(404);

        expect(body.message).to.contain('Policy response for endpoint id [bad_id] not found');
      });
    });
  });
}
