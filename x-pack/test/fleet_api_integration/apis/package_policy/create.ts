/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import expect from '@kbn/expect';
import { INGEST_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { Installation } from '@kbn/fleet-plugin/common';
import { v4 as uuidv4 } from 'uuid';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from '../space_awareness/api_helper';
import { cleanFleetIndices, expectToRejectWithError } from '../space_awareness/helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const es: Client = getService('es');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');
  const apiClient = new SpaceTestApiClient(supertest);

  const getPackagePolicyById = async (id: string) => {
    const { body } = await supertest.get(`/api/fleet/package_policies/${id}`);
    return body;
  };
  describe('Package Policy - create', () => {
    skipIfNoDockerRegistry(providerContext);
    let agentPolicyId: string;
    let agentPolicyId2: string;
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await cleanFleetIndices(es);
      await fleetAndAgents.setup();

      const [agentPolicyResponse, agentPolicyResponse2] = await Promise.all([
        apiClient.createAgentPolicy(undefined, {
          name: `Test policy ${uuidv4()}`,
          namespace: 'default',
        }),
        apiClient.createAgentPolicy(undefined, {
          name: `Test policy ${uuidv4()}`,
          namespace: 'default',
        }),
      ]);

      agentPolicyId = agentPolicyResponse.item.id;
      agentPolicyId2 = agentPolicyResponse2.item.id;
    });
    after(async () => {
      await supertest
        .post(`/api/fleet/agent_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId });
      await supertest
        .post(`/api/fleet/agent_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId: agentPolicyId2 });

      await kibanaServer.savedObjects.cleanStandardList();
      await cleanFleetIndices(es);
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
        })
        .expect(200);

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
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        })
        .expect(200);
      const { body } = await supertest
        .get(`/internal/saved_objects_tagging/tags/_find?page=1&perPage=10000`)
        .expect(200);
      expect(body.tags.find((tag: any) => tag.name === 'Managed').relationCount).to.be(9);
      expect(body.tags.find((tag: any) => tag.name === 'For File Tests').relationCount).to.be(9);
    });

    it('should work with multiple policy ids', async function () {
      const response = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-6',
          description: '',
          namespace: 'default',
          policy_ids: [agentPolicyId, agentPolicyId2],
          enabled: true,
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        })
        .expect(200);
      expect(response.body.item.policy_ids).to.eql([agentPolicyId, agentPolicyId2]);
    });

    it('should work with no policy ids', async function () {
      const response = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-no-policies',
          description: '',
          namespace: 'default',
          policy_ids: [],
          enabled: true,
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        })
        .expect(200);
      expect(response.body.item.policy_id).to.eql(undefined);
      expect(response.body.item.policy_ids).to.eql([]);
    });

    it('should allow to pass an empty namespace', async function () {
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-5',
          description: '',
          namespace: '',
          policy_id: agentPolicyId,
          enabled: true,
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        })
        .expect(200);
    });

    it('should return a 400 with an invalid namespace', async function () {
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-2',
          description: '',
          namespace: 'InvalidNamespace',
          policy_id: agentPolicyId,
          enabled: true,
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
      await apiClient.installPackage({
        pkgName: 'endpoint',
        pkgVersion: '8.5.0',
        force: true,
      });
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'endpoint-1',
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
          inputs: [],
          package: {
            name: 'endpoint',
            title: 'Endpoint',
            version: '8.5.0',
          },
          force: true,
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
          inputs: [],
          package: {
            name: 'endpoint',
            title: 'Endpoint',
            version: '8.5.0',
          },
        })
        .expect(400);
    });

    it('should return a 409 if there is another package policy with the same name', async function () {
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'same-name-test-1',
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
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
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        })
        .expect(409);
    });

    it('should return a 409 if there is a package policy with the same name on a different policy', async function () {
      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `Test policy ${uuidv4()}`,
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
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        })
        .expect(409);
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

    it('should return a 200 when a package has no variables or data streams', async function () {
      await supertest
        .post('/api/fleet/package_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'no-variables-or-data-streams',
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
          inputs: [
            {
              enabled: true,
              streams: [],
              type: 'single_input',
            },
          ],
          package: {
            name: 'single_input_no_streams',
            version: '0.1.0',
          },
        })
        .expect(200);
    });

    it('should support additional_datastreams_permissions', async () => {
      const createPackagePolicyRes = await apiClient.createPackagePolicy(undefined, {
        name: 'filetest-3-' + Date.now(),
        description: '',
        namespace: 'default',
        policy_ids: [agentPolicyId],
        enabled: true,
        inputs: [
          {
            enabled: true,
            streams: [],
            type: 'single_input',
          },
        ],
        package: {
          name: 'filetest',
          title: 'For File Tests',
          version: '0.1.0',
        },
        additional_datastreams_permissions: ['logs-tata-default', 'metrics-tata-default'],
      } as any);

      const getPackagePolicyRes = await apiClient.getPackagePolicy(createPackagePolicyRes.item.id);

      expect(getPackagePolicyRes.item.additional_datastreams_permissions).to.eql([
        'logs-tata-default',
        'metrics-tata-default',
      ]);

      const policyDocRes = await es.search({
        index: '.fleet-policies',
        sort: [{ '@timestamp': 'desc' }],
        query: {
          term: {
            policy_id: agentPolicyId,
          },
        },
      });

      const packagePolicyPermission = (policyDocRes.hits?.hits[0]._source as any).data
        ?.output_permissions?.default?.[createPackagePolicyRes.item.id];

      expect(
        packagePolicyPermission.indices.find((permissions: any) =>
          permissions.names.includes('logs-tata-default')
        )
      ).to.eql({
        names: ['logs-tata-default', 'metrics-tata-default'],
        privileges: ['auto_configure', 'create_doc'],
      });
    });

    it('should throw with invalid additional_datastreams_permissions', async () => {
      await expectToRejectWithError(
        () =>
          apiClient.createPackagePolicy(undefined, {
            name: 'filetest-3-' + Date.now(),
            description: '',
            namespace: 'default',
            policy_ids: [agentPolicyId],
            enabled: true,
            inputs: [
              {
                enabled: true,
                streams: [],
                type: 'single_input',
              },
            ],
            package: {
              name: 'filetest',
              title: 'For File Tests',
              version: '0.1.0',
            },
            additional_datastreams_permissions: ['invalid-tata-default', 'metrics-tata-default'],
          } as any),
        /400 "Bad Request"/
      );
    });

    it('should return 200 and formatted inputs when the format=simplified query param is passed', async function () {
      const { body } = await supertest
        .post(`/api/fleet/package_policies?format=simplified`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-3',
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
          inputs: [
            {
              enabled: true,
              streams: [],
              type: 'single_input',
            },
          ],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        })
        .expect(200);

      expect(body.item.inputs).to.eql({ single_input: { enabled: true, streams: {} } });
    });

    it('should return 200 and arrayed inputs when the format=legacy query param is passed', async function () {
      const inputs = [
        {
          enabled: true,
          streams: [],
          type: 'single_input',
        },
      ];
      const { body } = await supertest
        .post(`/api/fleet/package_policies?format=legacy`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-4',
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
          inputs,
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        })
        .expect(200);

      expect(body.item.inputs).to.eql(inputs);
    });

    it('should return 400 if an invalid format query param is passed', async function () {
      await supertest
        .post(`/api/fleet/package_policies?format=foo`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-2',
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
          inputs: [
            {
              enabled: true,
              streams: [],
              type: 'single_input',
            },
          ],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        })
        .expect(400);
    });

    it('should return 200 and disable an input that has all disabled streams', async function () {
      const { body } = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-disabled-streams',
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
          inputs: [
            {
              enabled: true,
              streams: [
                {
                  enabled: false,
                  data_stream: {
                    type: 'logs',
                    dataset: 'test.some_logs',
                  },
                },
              ],
              type: 'single_input',
            },
          ],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        })
        .expect(200);
      expect(body.item.inputs[0].enabled).to.eql(false);
    });

    it('should return 400 for content packages', async function () {
      const response = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'content-pkg-policy',
          description: '',
          namespace: 'default',
          policy_ids: [],
          package: {
            name: 'good_content',
            version: '0.1.0',
          },
        })
        .expect(400);
      expect(response.body.message).to.eql('Cannot create policy for content only packages');
    });

    it('should return 400 if setting output to non-local ES for an agentless integration', async function () {
      const { body: outputResponse } = await supertest
        .post(`/api/fleet/outputs`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'logstash-output',
          type: 'logstash',
          hosts: ['test.fr:443'],
          ssl: {
            certificate: 'CERTIFICATE',
            key: 'KEY',
            certificate_authorities: ['CA1', 'CA2'],
          },
        })
        .expect(200);

      const response = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'agentless-integration-policy',
          description: '',
          namespace: 'default',
          policy_ids: [],
          package: {
            name: 'with_required_variables',
            version: '0.1.0',
          },
          supports_agentless: true,
          output_id: outputResponse.item.id,
        })
        .expect(400);

      expect(response.body.message).to.eql(
        'Output type "logstash" is not usable with package "with_required_variables"'
      );
    });

    describe('input only packages', () => {
      it('should default dataset if not provided for input only pkg', async function () {
        await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            policy_id: agentPolicyId,
            package: {
              name: 'integration_to_input',
              version: '2.0.0',
            },
            name: 'integration_to_input-1',
            description: '',
            namespace: 'default',
            inputs: {
              'logs-logfile': {
                enabled: true,
                streams: {
                  'integration_to_input.logs': {
                    enabled: true,
                    vars: {
                      paths: ['/tmp/test.log'],
                      tags: ['tag1'],
                      ignore_older: '72h',
                    },
                  },
                },
              },
            },
          })
          .expect(200);
      });
      it('should successfully create an input only package policy with all required vars', async function () {
        await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            policy_id: agentPolicyId,
            package: {
              name: 'integration_to_input',
              version: '2.0.0',
            },
            name: 'integration_to_input-2',
            description: '',
            namespace: 'default',
            inputs: {
              'logs-logfile': {
                enabled: true,
                streams: {
                  'integration_to_input.logs': {
                    enabled: true,
                    vars: {
                      paths: ['/tmp/test.log'],
                      tags: ['tag1'],
                      ignore_older: '72h',
                      'data_stream.dataset': 'generic',
                    },
                  },
                },
              },
            },
          })
          .expect(200);
      });
    });

    describe('Simplified package policy', () => {
      it('should support providing an id', async () => {
        const id = `test-id-${Date.now()}`;

        await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            id,
            name: `create-simplified-package-policy-required-variables-${Date.now()}`,
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            inputs: {
              'with_required_variables-test_input': {
                streams: {
                  'with_required_variables.log': {
                    vars: { test_var_required: 'I am required' },
                  },
                },
              },
            },
            package: {
              name: 'with_required_variables',
              version: '0.1.0',
            },
          })
          .expect(200);

        await await supertest.get(`/api/fleet/package_policies/${id}`).expect(200);
      });

      it('should work with valid values', async () => {
        await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `create-simplified-package-policy-required-variables-${Date.now()}`,
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            inputs: {
              'with_required_variables-test_input': {
                streams: {
                  'with_required_variables.log': {
                    vars: { test_var_required: 'I am required' },
                  },
                },
              },
            },
            package: {
              name: 'with_required_variables',
              version: '0.1.0',
            },
          })
          .expect(200);
      });

      it('should throw with invalid variables', async () => {
        const { body } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `create-simplified-package-policy-required-variables-${Date.now()}`,
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            inputs: {
              'with_required_variables-test_input': {
                streams: {
                  'with_required_variables.log': {
                    vars: { var_id_do_exists: 'I do not exists' },
                  },
                },
              },
            },
            package: {
              name: 'with_required_variables',
              version: '0.1.0',
            },
          })
          .expect(400);

        expect(body.message).eql(
          'Variable with_required_variables-test_input with_required_variables.log:var_id_do_exists not found'
        );
      });

      it('should throw with invalid inputs', async () => {
        await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `create-simplified-package-policy-required-variables-${Date.now()}`,
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            inputs: {
              'i-do-not-exists-input': {},
            },
            package: {
              name: 'with_required_variables',
              version: '0.1.0',
            },
          })
          .expect(400);
      });

      it('should throw with invalid streams', async () => {
        await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `create-simplified-package-policy-required-variables-${Date.now()}`,
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            inputs: {
              'with_required_variables-test_input': {
                streams: {
                  'iamnotexisting.log': {
                    vars: { test_var_required: 'I am required' },
                  },
                },
              },
            },
            package: {
              name: 'with_required_variables',
              version: '0.1.0',
            },
          })
          .expect(400);
      });

      it('should return 200 and formatted inputs when the format=simplified query param is passed', async () => {
        const { body } = await supertest
          .post(`/api/fleet/package_policies?format=simplified`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'create-simplified-package-policy-required-variables-1',
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            inputs: {
              'with_required_variables-test_input': {
                streams: {
                  'with_required_variables.log': {
                    vars: { test_var_required: 'I am required' },
                  },
                },
              },
            },
            package: {
              name: 'with_required_variables',
              version: '0.1.0',
            },
          })
          .expect(200);

        expect(body.item.inputs).to.eql({
          'with_required_variables-test_input': {
            enabled: true,
            streams: {
              'with_required_variables.log': {
                enabled: true,
                vars: { test_var_required: 'I am required' },
              },
            },
          },
        });
      });

      it('should return 200 and arrayed inputs when the format=legacy query param is passed', async () => {
        const { body } = await supertest
          .post(`/api/fleet/package_policies?format=legacy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'create-simplified-package-policy-required-variables-2',
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            inputs: {
              'with_required_variables-test_input': {
                streams: {
                  'with_required_variables.log': {
                    vars: { test_var_required: 'I am required' },
                  },
                },
              },
            },
            package: {
              name: 'with_required_variables',
              version: '0.1.0',
            },
          })
          .expect(200);

        expect(Array.isArray(body.item.inputs));
      });

      it('should return 400 if an invalid format query param is passed', async function () {
        await supertest
          .post(`/api/fleet/package_policies?format=foo`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `create-simplified-package-policy-required-variables-${Date.now()}`,
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            inputs: {
              'with_required_variables-test_input': {
                streams: {
                  'with_required_variables.log': {
                    vars: { test_var_required: 'I am required' },
                  },
                },
              },
            },
            package: {
              name: 'with_required_variables',
              version: '0.1.0',
            },
          })
          .expect(400);
      });

      it('should support additional_datastreams_permissions', async () => {
        const createPackagePolicyRes = await apiClient.createPackagePolicy(undefined, {
          name: `create-simplified-package-policy-required-variables-${Date.now()}`,
          description: '',
          namespace: 'default',
          policy_ids: [agentPolicyId],
          inputs: {
            'with_required_variables-test_input': {
              streams: {
                'with_required_variables.log': {
                  vars: { test_var_required: 'I am required' },
                },
              },
            },
          },
          package: {
            name: 'with_required_variables',
            version: '0.1.0',
          },
          additional_datastreams_permissions: ['logs-test-default', 'metrics-test-default'],
        });

        const getPackagePolicyRes = await apiClient.getPackagePolicy(
          createPackagePolicyRes.item.id
        );

        expect(getPackagePolicyRes.item.additional_datastreams_permissions).to.eql([
          'logs-test-default',
          'metrics-test-default',
        ]);

        const policyDocRes = await es.search({
          index: '.fleet-policies',
          sort: [{ '@timestamp': 'desc' }],
          query: {
            term: {
              policy_id: agentPolicyId,
            },
          },
        });

        const packagePolicyPermission = (policyDocRes.hits?.hits[0]._source as any).data
          ?.output_permissions?.default?.[createPackagePolicyRes.item.id];

        expect(
          packagePolicyPermission.indices.find((permissions: any) =>
            permissions.names.includes('logs-test-default')
          )
        ).to.eql({
          names: ['logs-test-default', 'metrics-test-default'],
          privileges: ['auto_configure', 'create_doc'],
        });
      });
    });

    describe('Package verification', () => {
      const uninstallPackage = async (pkg: string, version: string) => {
        await supertest.delete(`/api/fleet/epm/packages/${pkg}/${version}`).set('kbn-xsrf', 'xxxx');
      };

      const getInstallationSavedObject = async (pkg: string): Promise<Installation | undefined> => {
        const res: { _source?: { 'epm-packages': Installation } } = await es.transport.request({
          method: 'GET',
          path: `/${INGEST_SAVED_OBJECT_INDEX}/_doc/epm-packages:${pkg}`,
        });

        return res?._source?.['epm-packages'] as Installation;
      };
      const TEST_KEY_ID = 'd2a182a7b0e00c14';

      afterEach(async () => {
        await uninstallPackage('verified', '1.0.0');
        await uninstallPackage('unverified_content', '1.0.0');
      });

      it('should work with a verified package', async function () {
        await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'verified-1',
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            enabled: true,
            inputs: [
              {
                type: 'logfile',
                policy_template: 'logs',
                enabled: true,
                streams: [
                  {
                    enabled: true,
                    data_stream: { type: 'logs', dataset: 'verified.log' },
                    vars: {
                      paths: { type: 'text', value: ['/tmp/test.log'] },
                      'data_stream.dataset': { value: 'generic', type: 'text' },
                      custom: { value: '', type: 'yaml' },
                    },
                  },
                ],
              },
            ],
            package: { name: 'verified', title: 'Verified Package', version: '1.0.0' },
          })
          .expect(200);

        const installationSO = await getInstallationSavedObject('verified');
        expect(installationSO?.verification_status).equal('verified');
        expect(installationSO?.verification_key_id).equal(TEST_KEY_ID);
      });
      it('should return 400 for unverified package', async function () {
        const res = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'unverified_content_' + Date.now(),
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            enabled: true,
            inputs: [
              {
                type: 'logfile',
                policy_template: 'logs',
                enabled: true,
                streams: [
                  {
                    enabled: true,
                    data_stream: { type: 'logs', dataset: 'unverified_content.log' },
                    vars: {
                      paths: { type: 'text', value: ['/tmp/test.log'] },
                      'data_stream.dataset': { value: 'generic', type: 'text' },
                      custom: { value: '', type: 'yaml' },
                    },
                  },
                ],
              },
            ],
            package: { name: 'unverified_content', title: 'Unerified Package', version: '1.0.0' },
          });

        expect(res.status).equal(400);
        expect(res.body.attributes).eql({
          type: 'verification_failed',
        });
      });
      it('should return 200 for force installed unverified package', async function () {
        await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'unverified_content-' + Date.now(),
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            enabled: true,
            inputs: [
              {
                type: 'logfile',
                policy_template: 'logs',
                enabled: true,
                streams: [
                  {
                    enabled: true,
                    data_stream: { type: 'logs', dataset: 'unverified_content.log' },
                    vars: {
                      paths: { type: 'text', value: ['/tmp/test.log'] },
                      'data_stream.dataset': { value: 'generic', type: 'text' },
                      custom: { value: '', type: 'yaml' },
                    },
                  },
                ],
              },
            ],
            package: { name: 'unverified_content', title: 'Unerified Package', version: '1.0.0' },
            force: true,
          })
          .expect(200);

        const installationSO = await getInstallationSavedObject('unverified_content');
        expect(installationSO?.verification_status).equal('unverified');
        expect(installationSO?.verification_key_id).equal(TEST_KEY_ID);
      });
    });
  });
}
