/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const dockerServers = getService('dockerServers');

  const server = dockerServers.get('registry');
  // use function () {} and not () => {} here
  // because `this` has to point to the Mocha context
  // see https://mochajs.org/#arrow-functions

  describe('Package Policy - get by id', async function () {
    skipIfNoDockerRegistry(providerContext);
    let agentPolicyId: string;
    let packagePolicyId: string;

    before(async function () {
      if (!server.enabled) {
        return;
      }
      const { body: agentPolicyResponse } = await supertest
        .post(`/api/ingest_manager/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
        });
      agentPolicyId = agentPolicyResponse.item.id;

      const { body: packagePolicyResponse } = await supertest
        .post(`/api/ingest_manager/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
          output_id: '',
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        });
      packagePolicyId = packagePolicyResponse.item.id;
    });

    after(async function () {
      if (!server.enabled) {
        return;
      }

      await supertest
        .post(`/api/ingest_manager/agent_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId })
        .expect(200);

      await supertest
        .post(`/api/ingest_manager/package_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ packagePolicyIds: [packagePolicyId] })
        .expect(200);
    });

    it('should succeed with a valid id', async function () {
      const { body: apiResponse } = await supertest
        .get(`/api/ingest_manager/package_policies/${packagePolicyId}`)
        .expect(200);

      expect(apiResponse.success).to.be(true);
    });

    it('should return a 404 with an invalid id', async function () {
      await supertest.get(`/api/ingest_manager/package_policies/IS_NOT_PRESENT`).expect(404);
    });
  });
}
