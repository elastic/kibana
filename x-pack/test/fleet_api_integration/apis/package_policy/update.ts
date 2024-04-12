/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { policyFactory } from '@kbn/security-solution-plugin/common/endpoint/models/policy_config';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { sortBy } from 'lodash';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { testUsers } from '../test_users';
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const superTestWithoutAuth = getService('supertestWithoutAuth');
  const dockerServers = getService('dockerServers');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const expectIdArraysEqual = (arr1: any[], arr2: any[]) => {
    expect(sortBy(arr1, 'id')).to.eql(sortBy(arr2, 'id'));
  };

  const getInstallationSavedObject = async (name: string, version: string) => {
    const res = await supertest.get(`/api/fleet/epm/packages/${name}/${version}`).expect(200);
    return res.body.item.savedObject.attributes;
  };

  const getPackagePolicyById = async (id: string) => {
    const { body } = await supertest.get(`/api/fleet/package_policies/${id}`);
    return body;
  };

  const getComponentTemplate = async (name: string) => {
    try {
      const { component_templates: templates } = await es.cluster.getComponentTemplate({ name });

      return templates?.[0] || null;
    } catch (e) {
      if (e.statusCode === 404) {
        return null;
      }

      throw e;
    }
  };

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
    let packagePolicyId3: string;
    let endpointPackagePolicyId: string;
    let inputOnlyPackagePolicyId: string;

    let inputOnlyBasePackagePolicy: NewPackagePolicy;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    before(async function () {
      if (!server.enabled) {
        return;
      }
      const [{ body: agentPolicyResponse }, { body: managedAgentPolicyResponse }] =
        await Promise.all([
          supertest.post(`/api/fleet/agent_policies`).set('kbn-xsrf', 'xxxx').send({
            name: 'Test policy',
            namespace: 'default',
          }),
          supertest.post(`/api/fleet/agent_policies`).set('kbn-xsrf', 'xxxx').send({
            name: 'Test hosted agent policy',
            namespace: 'default',
            is_managed: true,
          }),
        ]);

      agentPolicyId = agentPolicyResponse.item.id;

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

      inputOnlyBasePackagePolicy = {
        name: 'input-only-test-1',
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
                data_stream: { type: 'logs', dataset: 'input_package.logs' },
                vars: {
                  paths: { type: 'text', value: ['/tmp/test.log'] },
                  tags: { type: 'text', value: ['tag1'] },
                  ignore_older: { value: '72h', type: 'text' },
                  'data_stream.dataset': { type: 'text', value: 'input_package_test' },
                },
              },
            ],
          },
        ],
        package: { name: 'input_package', title: 'Input only package', version: '1.0.0' },
      };

      const { body: packagePolicyResponse } = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
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
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        });
      packagePolicyId2 = packagePolicyResponse2.item.id;

      const { body: packagePolicyResponse3 } = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'update-package-policy-with_required_variables-1',
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
        });
      packagePolicyId3 = packagePolicyResponse3.item.id;

      const { body: endpointPackagePolicyResponse } = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'endpoint-1',
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          enabled: true,
          inputs: [
            {
              enabled: true,
              streams: [],
              type: 'endpoint',
            },
          ],
          force: true,
          package: {
            name: 'endpoint',
            title: 'Elastic Defend',
            version: '8.6.1',
          },
        });
      endpointPackagePolicyId = endpointPackagePolicyResponse.item.id;

      const { body: inputOnlyPolicyResponse } = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send(inputOnlyBasePackagePolicy);

      inputOnlyPackagePolicyId = inputOnlyPolicyResponse.item.id;
    });

    after(async function () {
      await supertest
        .post(`/api/fleet/agent_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId });
      // uninstall endpoint package
      await supertest
        .delete(`/api/fleet/epm/packages/endpoint/8.6.1`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      await supertest
        .delete(`/api/fleet/epm/packages/input_package/1.0.0`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should work with valid values on "regular" policies', async function () {
      await supertest
        .put(`/api/fleet/package_policies/${packagePolicyId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
          description: '',
          namespace: 'updated_namespace',
          policy_id: agentPolicyId,
          enabled: true,
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        });
    });

    it('should trim whitespace from name on update', async function () {
      await supertest
        .put(`/api/fleet/package_policies/${packagePolicyId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: '  filetest-1  ',
          description: '',
          namespace: 'updated_namespace',
          policy_id: agentPolicyId,
          enabled: true,
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        });

      const { item: policy } = await getPackagePolicyById(packagePolicyId);

      expect(policy.name).to.equal('filetest-1');
    });

    it('should work with valid values on hosted policies', async function () {
      await supertest
        .put(`/api/fleet/package_policies/${packagePolicyId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
          description: '',
          namespace: 'updated_namespace',
          policy_id: managedAgentPolicyId,
          enabled: true,
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        });
    });

    it('should succeed when updating packages that are allowed with package privileges', async function () {
      await superTestWithoutAuth
        .put(`/api/fleet/package_policies/${endpointPackagePolicyId}`)
        .set('kbn-xsrf', 'xxxx')
        .auth(
          testUsers.endpoint_integr_write_policy.username,
          testUsers.endpoint_integr_write_policy.password
        )
        .send({
          name: 'endpoint-1',
          description: '',
          namespace: 'updated_namespace',
          policy_id: agentPolicyId,
          enabled: true,
          inputs: [
            {
              enabled: true,
              streams: [],
              config: {
                policy: {
                  value: policyFactory(),
                },
              },
              type: 'endpoint',
            },
          ],
          force: true,
          package: {
            name: 'endpoint',
            title: 'Elastic Defend',
            version: '8.6.1',
          },
        })
        .expect(200);
    });

    it('should return a 403 with package names that are not allowed', async function () {
      await superTestWithoutAuth
        .put(`/api/fleet/package_policies/${packagePolicyId}`)
        .set('kbn-xsrf', 'xxxx')
        .auth(
          testUsers.endpoint_integr_write_policy.username,
          testUsers.endpoint_integr_write_policy.password
        )
        .send({
          name: 'updated_name',
          description: '',
          namespace: 'updated_namespace',
          policy_id: agentPolicyId,
          enabled: true,
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        })
        .expect(403, {
          error: 'Forbidden',
          message: 'Update for package name filetest is not authorized.',
          statusCode: 403,
        });
    });

    it('should return a 409 if there is another package policy with the same name', async function () {
      await supertest
        .put(`/api/fleet/package_policies/${packagePolicyId2}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
          description: '',
          namespace: 'updated_namespace',
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

    it('should return a 409 if there is another package policy with the same name on a different policy', async function () {
      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy 2',
          namespace: 'default',
        });
      const otherAgentPolicyId = agentPolicyResponse.item.id;

      await supertest
        .put(`/api/fleet/package_policies/${packagePolicyId2}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
          description: '',
          namespace: 'updated_namespace',
          policy_id: otherAgentPolicyId,
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

    it('should work with frozen input vars', async function () {
      await supertest
        .put(`/api/fleet/package_policies/${packagePolicyId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
          description: '',
          namespace: 'updated_namespace',
          policy_id: agentPolicyId,
          enabled: true,
          inputs: [
            {
              enabled: true,
              type: 'test-input',
              streams: [],
              vars: {
                frozen_var: {
                  type: 'text',
                  value: 'abc',
                  frozen: true,
                },
                unfrozen_var: {
                  type: 'text',
                  value: 'def',
                },
              },
            },
          ],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        });
    });

    it('should succeed and return formatted inputs when the format=simplified query param is passed', async function () {
      const {
        body: { item },
      } = await supertest
        .put(`/api/fleet/package_policies/${packagePolicyId}?format=simplified`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
          description: '',
          namespace: 'updated_namespace',
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

      expect(Array.isArray(item.inputs)).to.be(false);
    });

    it('should succeed and return arrayed inputs when the format=legacy query param is passed', async function () {
      const {
        body: { item },
      } = await supertest
        .put(`/api/fleet/package_policies/${packagePolicyId}?format=legacy`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
          description: '',
          namespace: 'updated_namespace',
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

      expect(Array.isArray(item.inputs));
    });

    it('should return 400 if an invalid format query param is passed', async function () {
      await supertest
        .put(`/api/fleet/package_policies/${packagePolicyId}?format=foo`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
          description: '',
          namespace: 'updated_namespace',
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

    describe('Simplified package policy', async () => {
      it('should work with valid values', async function () {
        await supertest
          .put(`/api/fleet/package_policies/${packagePolicyId3}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `update-simplified-package-policy-with_required_variables-${Date.now()}`,
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

      it('should return a 400 with invalid inputs', async function () {
        const { body } = await supertest
          .put(`/api/fleet/package_policies/${packagePolicyId3}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `update-simplified-package-policy-with_required_variables-${Date.now()}`,
            description: '',
            namespace: 'default',
            policy_id: agentPolicyId,
            inputs: {
              'with_required_variables-i-do-not-exists': {},
            },
            package: {
              name: 'with_required_variables',
              version: '0.1.0',
            },
          })
          .expect(400);
        expect(body.message).eql('Input not found: with_required_variables-i-do-not-exists');
      });

      it('should return a 400 if namespace is edited on input only package policy', async function () {
        const { body } = await supertest
          .put(`/api/fleet/package_policies/${inputOnlyPackagePolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            ...inputOnlyBasePackagePolicy,
            namespace: 'updated_namespace',
          })
          .expect(400);
        expect(body.message).eql(
          'Package policy namespace cannot be modified for input only packages, please create a new package policy.'
        );
      });

      it('should return a 400 if dataset is edited on input only package policy', async function () {
        const updatedPolicy = JSON.parse(JSON.stringify(inputOnlyBasePackagePolicy));

        updatedPolicy.inputs[0].streams[0].vars['data_stream.dataset'].value = 'updated_dataset';

        const { body } = await supertest
          .put(`/api/fleet/package_policies/${inputOnlyPackagePolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updatedPolicy)
          .expect(400);
        expect(body.message).eql(
          'Package policy dataset cannot be modified for input only packages, please create a new package policy.'
        );
      });

      it('should succeed and return formatted inputs when the format=simplified query param is passed', async function () {
        const {
          body: { item },
        } = await supertest
          .put(`/api/fleet/package_policies/${packagePolicyId}?format=simplified`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `update-simplified-package-policy-with_required_variables-${Date.now()}`,
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

        expect(Array.isArray(item.inputs)).to.be(false);
      });

      it('should succeed and return arrayed inputs when the format=legacy query param is passed', async function () {
        const {
          body: { item },
        } = await supertest
          .put(`/api/fleet/package_policies/${packagePolicyId}?format=legacy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `update-simplified-package-policy-with_required_variables-${Date.now()}`,
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

        expect(Array.isArray(item.inputs));
      });

      it('should return 400 if an invalid format query param is passed', async function () {
        await supertest
          .put(`/api/fleet/package_policies/${packagePolicyId}?format=foo`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `update-simplified-package-policy-with_required_variables-${Date.now()}`,
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
    });

    describe('Input Packages', () => {
      it('should install index templates when upgrading from input package to integration package', async () => {
        const { body: packagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            policy_id: agentPolicyId,
            force: true,
            package: {
              name: 'integration_to_input',
              version: '1.0.0',
            },
            name: 'integration_to_input-1',
            description: '',
            namespace: 'default',
            inputs: {
              'logs-logfile': {
                enabled: true,
                streams: {
                  'integration_to_input.log': {
                    enabled: true,
                    vars: {
                      paths: ['/tmp/test.log'],
                      'data_stream.dataset': 'somedataset',
                      custom: '',
                    },
                  },
                },
              },
            },
          });

        const inputPackagePolicyId = packagePolicyResponse.item.id;

        await supertest
          .put(`/api/fleet/package_policies/${inputPackagePolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            package: {
              name: 'integration_to_input',
              version: '2.0.0',
              experimental_data_stream_features: [],
            },
            name: 'integration_to_input-1',
            namespace: 'default',
            description: '',
            policy_id: agentPolicyId,
            vars: {},
            inputs: {
              'logs-logfile': {
                enabled: true,
                streams: {
                  'integration_to_input.logs': {
                    enabled: true,
                    vars: {
                      paths: ['/tmp/test.log'],
                      'data_stream.dataset': 'somedataset',
                      tags: ['tag1'],
                      ignore_older: '72h',
                    },
                  },
                },
              },
            },
          })
          .expect(200);

        const installation = await getInstallationSavedObject('integration_to_input', '2.0.0');
        expectIdArraysEqual(installation.installed_es, [
          // assets from version 1.0.0
          { id: 'logs-integration_to_input.log', type: 'index_template' },
          { id: 'logs-integration_to_input.log-1.0.0', type: 'ingest_pipeline' },
          { id: 'logs-integration_to_input.log@custom', type: 'component_template' },
          { id: 'logs-integration_to_input.log@package', type: 'component_template' },
          // assets from version 2.0.0 for new package policy
          { id: 'logs-somedataset-2.0.0', type: 'ingest_pipeline' },
          { id: 'logs-somedataset', type: 'index_template' },
          { id: 'logs-somedataset@package', type: 'component_template' },
          { id: 'logs-somedataset@custom', type: 'component_template' },
          { id: 'logs@mappings', type: 'component_template' },
        ]);

        const dataset3PkgComponentTemplate = await getComponentTemplate('logs-somedataset@package');
        expect(dataset3PkgComponentTemplate).not.to.be(null);
      });
    });
  });
}
