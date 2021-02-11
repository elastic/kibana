/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

  describe('Package Policy - update', async function () {
    skipIfNoDockerRegistry(providerContext);
    let agentPolicyId: string;
    let managedAgentPolicyId: string;
    let packagePolicyId: string;
    let packagePolicyId2: string;

    before(async function () {
      if (!server.enabled) {
        return;
      }
      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
        });

      agentPolicyId = agentPolicyResponse.item.id;

      const { body: managedAgentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test managed policy',
          namespace: 'default',
          is_managed: true,
        });

      // if one already exists, re-use that
      const managedExists = managedAgentPolicyResponse.statusCode === 409;
      if (managedExists) {
        const errorRegex = /^agent policy \'(?<id>[\w,\-]+)\' already exists/i;
        const result = errorRegex.exec(managedAgentPolicyResponse.message);
        if (result?.groups?.id) {
          managedAgentPolicyId = result.groups.id;
        }
      } else {
        managedAgentPolicyId = managedAgentPolicyResponse.item.id;
      }

      const { body: packagePolicyResponse } = await supertest
        .post(`/api/fleet/package_policies`)
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

      const { body: packagePolicyResponse2 } = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-2',
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
      packagePolicyId2 = packagePolicyResponse2.item.id;
    });

    after(async function () {
      await supertest
        .post(`/api/fleet/agent_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId });
    });

    it('should fail on managed agent policies', async function () {
      const { body } = await supertest
        .put(`/api/fleet/package_policies/${packagePolicyId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
          description: '',
          namespace: 'updated_namespace',
          policy_id: managedAgentPolicyId,
          enabled: true,
          output_id: '',
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        })
        .expect(400);

      expect(body.message).to.contain('Cannot update integrations of managed policy');
    });

    it('should work with valid values', async function () {
      await supertest
        .put(`/api/fleet/package_policies/${packagePolicyId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
          description: '',
          namespace: 'updated_namespace',
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
    });

    it('should return a 500 if there is another package policy with the same name', async function () {
      await supertest
        .put(`/api/fleet/package_policies/${packagePolicyId2}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
          description: '',
          namespace: 'updated_namespace',
          policy_id: agentPolicyId,
          enabled: true,
          output_id: '',
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        })
        .expect(500);
    });
  });
}
