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

  // use function () {} and not () => {} here
  // because `this` has to point to the Mocha context
  // see https://mochajs.org/#arrow-functions

  describe('Package Policy - delete', async function () {
    skipIfNoDockerRegistry(providerContext);
    let agentPolicy: any;
    let packagePolicy: any;

    before(async function () {
      let agentPolicyResponse = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
          is_managed: false,
        });

      // if one already exists, re-use that
      if (agentPolicyResponse.body.statusCode === 409) {
        const errorRegex = /^agent policy \'(?<id>[\w,\-]+)\' already exists/i;
        const result = errorRegex.exec(agentPolicyResponse.body.message);
        if (result?.groups?.id) {
          agentPolicyResponse = await supertest
            .put(`/api/fleet/agent_policies/${result.groups.id}`)
            .set('kbn-xsrf', 'xxxx')
            .send({
              name: 'Test policy',
              namespace: 'default',
              is_managed: false,
            });
        }
      }
      agentPolicy = agentPolicyResponse.body.item;

      const { body: packagePolicyResponse } = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
          description: '',
          namespace: 'default',
          policy_id: agentPolicy.id,
          enabled: true,
          output_id: '',
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        });
      packagePolicy = packagePolicyResponse.item;
    });

    after(async function () {
      await supertest
        .post(`/api/fleet/agent_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId: agentPolicy.id });

      await supertest
        .post(`/api/fleet/package_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ packagePolicyIds: [packagePolicy.id] });
    });

    it('should fail on managed agent policies', async function () {
      // update existing policy to managed
      await supertest
        .put(`/api/fleet/agent_policies/${agentPolicy.id}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: agentPolicy.name,
          namespace: agentPolicy.namespace,
          is_managed: true,
        })
        .expect(200);

      // try to delete
      const { body: results } = await supertest
        .post(`/api/fleet/package_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ packagePolicyIds: [packagePolicy.id] })
        .expect(200);

      // delete always succeeds (returns 200) with Array<{success: boolean}>
      expect(Array.isArray(results));
      expect(results.length).to.be(1);
      expect(results[0].success).to.be(false);
      expect(results[0].body.message).to.contain('Cannot remove integrations of managed policy');

      // revert existing policy to unmanaged
      await supertest
        .put(`/api/fleet/agent_policies/${agentPolicy.id}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: agentPolicy.name,
          namespace: agentPolicy.namespace,
          is_managed: false,
        })
        .expect(200);
    });

    it('should work for unmanaged policies', async function () {
      await supertest
        .post(`/api/fleet/package_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ packagePolicyIds: [packagePolicy.id] });
    });
  });
}
