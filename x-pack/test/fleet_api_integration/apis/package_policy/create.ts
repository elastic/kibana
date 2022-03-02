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

  const getPackagePolicyById = async (id: string) => {
    const { body } = await supertest.get(`/api/fleet/package_policies/${id}`);
    return body;
  };
  // use function () {} and not () => {} here
  // because `this` has to point to the Mocha context
  // see https://mochajs.org/#arrow-functions

  describe('Package Policy - create', async function () {
    skipIfNoDockerRegistry(providerContext);
    let agentPolicyId: string;
    before(async () => {
      await getService('esArchiver').load('x-pack/test/functional/es_archives/empty_kibana');
      await getService('esArchiver').load(
        'x-pack/test/functional/es_archives/fleet/empty_fleet_server'
      );
    });
    after(async () => {
      await getService('esArchiver').unload('x-pack/test/functional/es_archives/empty_kibana');
      await getService('esArchiver').unload(
        'x-pack/test/functional/es_archives/fleet/empty_fleet_server'
      );
    });

    before(async function () {
      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
        });
      agentPolicyId = agentPolicyResponse.item.id;
    });

    after(async function () {
      await supertest
        .post(`/api/fleet/agent_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId });
    });

    it('can only add to hosted agent policies using the force parameter', async function () {
      // get a hosted policy
      const {
        body: { item: hostedPolicy },
      } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `Hosted policy from ${Date.now()}`,
          namespace: 'default',
          is_managed: true,
        });

      // try to add an integration to the hosted policy
      const { body: responseWithoutForce } = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest',
          description: '',
          namespace: 'default',
          policy_id: hostedPolicy.id,
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

      expect(responseWithoutForce.statusCode).to.be(400);
      expect(responseWithoutForce.message).to.contain(
        'Cannot update integrations of hosted agent policy'
      );

      // try same request with `force: true`
      const { body: responseWithForce } = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          force: true,
          name: 'filetest-1',
          description: '',
          namespace: 'default',
          policy_id: hostedPolicy.id,
          enabled: true,
          output_id: '',
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        })
        .expect(200);

      expect(responseWithForce.item.name).to.eql('filetest-1');

      // delete policy we just made
      await supertest.post(`/api/fleet/agent_policies/delete`).set('kbn-xsrf', 'xxxx').send({
        agentPolicyId: hostedPolicy.id,
      });
    });

    it('should work with valid values', async function () {
      await supertest
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
        })
        .expect(200);
    });

    it('should return a 400 with an empty namespace', async function () {
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
          description: '',
          namespace: '',
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
        .expect(400);
    });

    it('should return a 400 with an invalid namespace', async function () {
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
          description: '',
          namespace: 'InvalidNamespace',
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
        .expect(400);
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
          description: '',
          namespace:
            'testlength😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀',
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
        .expect(400);
    });

    it('should not allow multiple limited packages on the same agent policy', async function () {
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'endpoint-1',
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
          output_id: '',
          inputs: [],
          package: {
            name: 'endpoint',
            title: 'Endpoint',
            version: '1.4.1',
          },
        })
        .expect(200);
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'endpoint-2',
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
          output_id: '',
          inputs: [],
          package: {
            name: 'endpoint',
            title: 'Endpoint',
            version: '1.5.0',
          },
        })
        .expect(400);
    });

    it('should return a 400 if there is another package policy with the same name', async function () {
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'same-name-test-1',
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
        })
        .expect(200);
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'same-name-test-1',
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
        })
        .expect(400);
    });

    it('should return a 400 if there is a package policy with the same name on a different policy', async function () {
      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy 2',
          namespace: 'default',
        });
      const otherAgentPolicyId = agentPolicyResponse.item.id;

      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'same-name-test-2',
          description: '',
          namespace: 'default',
          policy_id: otherAgentPolicyId,
          enabled: true,
          output_id: '',
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        })
        .expect(200);
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'same-name-test-2',
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
        })
        .expect(400);
    });

    it('should return a 400 with required variables not provided', async function () {
      const { body } = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'pacakge-policy-required-variables-test-456',
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
          output_id: '',
          inputs: [
            {
              enabled: true,
              streams: [
                {
                  data_stream: {
                    dataset: 'with_required_variables.log',
                    type: 'logs',
                  },
                  enabled: true,
                  vars: {},
                },
              ],
              type: 'test_input',
            },
          ],
          package: {
            name: 'with_required_variables',
            version: '0.1.0',
          },
        })
        .expect(400);
      expect(body.message).contain('Package policy is invalid');
    });

    it('should work with required variables provided', async function () {
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'pacakge-policy-required-variables-test-123',
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
          output_id: '',
          inputs: [
            {
              enabled: true,
              streams: [
                {
                  data_stream: {
                    dataset: 'with_required_variables.log',
                    type: 'logs',
                  },
                  enabled: true,
                  vars: {
                    test_var_required: {
                      value: 'I am required',
                    },
                  },
                },
              ],
              type: 'test_input',
            },
          ],
          package: {
            name: 'with_required_variables',
            version: '0.1.0',
          },
        })
        .expect(200);
    });

    it('should trim whitespace from policy name', async function () {
      const nameWithWhitespace = '  package-policy-with-whitespace-prefix-and-suffix  ';
      const { body } = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: nameWithWhitespace,
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
          output_id: '',
          inputs: [
            {
              enabled: true,
              streams: [
                {
                  data_stream: {
                    dataset: 'with_required_variables.log',
                    type: 'logs',
                  },
                  enabled: true,
                  vars: {
                    test_var_required: {
                      value: 'I am required',
                    },
                  },
                },
              ],
              type: 'test_input',
            },
          ],
          package: {
            name: 'with_required_variables',
            version: '0.1.0',
          },
        })
        .expect(200);

      const policyId = body.item.id;

      const { item: policy } = await getPackagePolicyById(policyId);

      expect(policy.name).to.equal(nameWithWhitespace.trim());
    });
  });
}
