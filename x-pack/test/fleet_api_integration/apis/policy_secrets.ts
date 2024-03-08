/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// 👋 Hello, investigating a test failure in this file?
// Each test relies on the previous test completing successfully.
// So start investigating from earliest test failure in the file.

import type { Client } from '@elastic/elasticsearch';
import expect from '@kbn/expect';
import { FullAgentPolicy } from '@kbn/fleet-plugin/common';
import { GLOBAL_SETTINGS_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common/constants';
import { v4 as uuidv4 } from 'uuid';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../helpers';
import { setupFleetAndAgents } from './agents/services';

const secretVar = (id: string) => `$co.elastic.secret{${id}}`;

const arrayIdsEqual = (a: Array<{ id: string }>, b: Array<{ id: string }>) => {
  if (a.length !== b.length) {
    return false;
  }
  return a.every(({ id }) => b.find(({ id: bid }) => bid === id));
};

function createdPolicyToUpdatePolicy(policy: any) {
  const updatedPolicy = JSON.parse(JSON.stringify(policy));
  delete updatedPolicy.id;
  delete updatedPolicy.revision;
  delete updatedPolicy.secret_references;
  delete updatedPolicy.created_at;
  delete updatedPolicy.created_by;
  delete updatedPolicy.updated_at;
  delete updatedPolicy.updated_by;
  delete updatedPolicy.inputs[0].compiled_input;
  delete updatedPolicy.inputs[0].streams[0].compiled_stream;
  delete updatedPolicy.name;
  return updatedPolicy;
}

const SECRETS_INDEX_NAME = '.fleet-secrets';
export default function (providerContext: FtrProviderContext) {
  describe('fleet policy secrets', () => {
    const { getService } = providerContext;

    const es: Client = getService('es');
    const supertest = getService('supertest');
    const kibanaServer = getService('kibanaServer');

    const createFleetServerAgentPolicy = async () => {
      const agentPolicyResponse = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxx')
        .send({
          name: `Fleet server policy ${uuidv4()}`,
          namespace: 'default',
        })
        .expect(200);

      const agentPolicyId = agentPolicyResponse.body.item.id;

      // create fleet_server package policy
      await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxx')
        .send({
          force: true,
          package: {
            name: 'fleet_server',
            version: '1.3.1',
          },
          name: `Fleet Server ${uuidv4()}`,
          namespace: 'default',
          policy_id: agentPolicyId,
          vars: {},
          inputs: {
            'fleet_server-fleet-server': {
              enabled: true,
              vars: {
                custom: '',
              },
              streams: {},
            },
          },
        })
        .expect(200);

      return agentPolicyId;
    };

    const createOutputWithSecret = async () => {
      const res = await supertest
        .post(`/api/fleet/outputs`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Kafka Output With Password Secret',
          type: 'kafka',
          hosts: ['test.fr:2000'],
          auth_type: 'user_pass',
          username: 'user',
          topics: [{ topic: 'topic1' }],
          config_yaml: 'shipper: {}',
          shipper: {
            disk_queue_enabled: true,
            disk_queue_path: 'path/to/disk/queue',
            disk_queue_encryption_enabled: true,
          },
          secrets: { password: 'pass' },
        });

      return res.body.item;
    };

    const createPolicyWithSecrets = async () => {
      return supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `secrets-${Date.now()}`,
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          inputs: {
            'secrets-test_input': {
              enabled: true,
              vars: {
                input_var_secret: 'input_secret_val',
                input_var_non_secret: 'input_non_secret_val',
              },
              streams: {
                'secrets.log': {
                  enabled: true,
                  vars: {
                    stream_var_secret: 'stream_secret_val',
                    stream_var_non_secret: 'stream_non_secret_val',
                  },
                },
              },
            },
          },
          vars: {
            package_var_secret: 'package_secret_val',
            package_var_non_secret: 'package_non_secret_val',
          },
          package: {
            name: 'secrets',
            version: '1.0.0',
          },
        })
        .expect(200);
    };

    async function createPolicyWSecretVar() {
      const { body: createResBody } = await createPolicyWithSecrets();
      const createdPolicy = createResBody.item;
      return createdPolicy;
    }

    const createFleetServerAgent = async (
      agentPolicyId: string,
      hostname: string,
      agentVersion: string
    ) => {
      const agentResponse = await es.index({
        index: '.fleet-agents',
        refresh: true,
        body: {
          access_api_key_id: 'api-key-3',
          active: true,
          policy_id: agentPolicyId,
          type: 'PERMANENT',
          local_metadata: {
            host: { hostname },
            elastic: { agent: { version: agentVersion } },
          },
          user_provided_metadata: {},
          enrolled_at: '2022-06-21T12:14:25Z',
          last_checkin: '2022-06-27T12:28:29Z',
          tags: ['tag1'],
        },
      });

      return agentResponse._id;
    };

    const clearAgents = async () => {
      try {
        await es.deleteByQuery({
          index: '.fleet-agents',
          refresh: true,
          body: {
            query: {
              match_all: {},
            },
          },
        });
      } catch (err) {
        // index doesn't exist
      }
    };

    const getSecrets = async (ids?: string[]) => {
      const query = ids ? { terms: { _id: ids } } : { match_all: {} };
      return es.search({
        index: SECRETS_INDEX_NAME,
        body: {
          query,
        },
      });
    };

    const deleteAllSecrets = async () => {
      try {
        await es.deleteByQuery({
          index: SECRETS_INDEX_NAME,
          body: {
            query: {
              match_all: {},
            },
          },
        });
      } catch (err) {
        // index doesn't exist
      }
    };

    const getPackagePolicyById = async (id: string) => {
      const { body } = await supertest.get(`/api/fleet/package_policies/${id}`);
      return body.item;
    };

    const enableSecrets = async () => {
      try {
        await kibanaServer.savedObjects.update({
          type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
          id: 'fleet-default-settings',
          attributes: {
            secret_storage_requirements_met: true,
          },
          overwrite: false,
        });
      } catch (e) {
        throw e;
      }
    };

    const disableSecrets = async () => {
      try {
        await kibanaServer.savedObjects.update({
          type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
          id: 'fleet-default-settings',
          attributes: {
            secret_storage_requirements_met: false,
          },
          overwrite: false,
        });
      } catch (e) {
        throw e;
      }
    };

    const getFullAgentPolicyById = async (id: string) => {
      const { body } = await supertest.get(`/api/fleet/agent_policies/${id}/full`).expect(200);
      return body.item;
    };

    const getLatestPolicyRevision = async (id: string): Promise<{ data: FullAgentPolicy }> => {
      const res = await es.search({
        index: '.fleet-policies',
        body: {
          query: {
            bool: {
              filter: [
                {
                  term: {
                    policy_id: id,
                  },
                },
              ],
            },
          },
          sort: [
            {
              revision_idx: {
                order: 'desc',
              },
            },
          ],
          size: 1,
        },
      });
      return res.hits.hits[0]._source as any as { data: FullAgentPolicy };
    };

    let duplicatedAgentPolicyId: string;
    let duplicatedPackagePolicyId: string;
    let createdPackagePolicy: any;
    let createdPackagePolicyId: string;
    let packageVarId: string;
    let updatedPackageVarId: string;
    let inputVarId: string;
    let streamVarId: string;
    let expectedCompiledStream: any;
    let expectedCompiledInput: any;

    function expectCompiledPolicyVars(policy: any, packageVarIdIn: string = packageVarId) {
      expect(
        arrayIdsEqual(policy.secret_references, [
          { id: packageVarIdIn },
          { id: streamVarId },
          { id: inputVarId },
        ])
      ).to.eql(true);
      expect(policy.inputs[0].package_var_secret).to.eql(secretVar(packageVarIdIn));
      expect(policy.inputs[0].input_var_secret).to.eql(secretVar(inputVarId));
      expect(policy.inputs[0].streams[0].package_var_secret).to.eql(secretVar(packageVarIdIn));
      expect(policy.inputs[0].streams[0].input_var_secret).to.eql(secretVar(inputVarId));
      expect(policy.inputs[0].streams[0].stream_var_secret).to.eql(secretVar(streamVarId));
    }

    skipIfNoDockerRegistry(providerContext);
    let agentPolicyId: string;
    let fleetServerAgentPolicyId: string;
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();

      await deleteAllSecrets();
      await clearAgents();
      await enableSecrets();
    });

    setupFleetAndAgents(providerContext);

    before(async () => {
      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `Test policy ${uuidv4()}`,
          namespace: 'default',
        })
        .expect(200);

      agentPolicyId = agentPolicyResponse.item.id;

      fleetServerAgentPolicyId = await createFleetServerAgentPolicy();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await getService('esArchiver').unload(
        'x-pack/test/functional/es_archives/fleet/empty_fleet_server'
      );
    });
    it('Should correctly create the policy with secrets', async () => {
      const { body: createResBody } = await supertest
        .post(`/api/fleet/package_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `secrets-${Date.now()}`,
          description: '',
          namespace: 'default',
          policy_id: agentPolicyId,
          inputs: {
            'secrets-test_input': {
              enabled: true,
              vars: {
                input_var_secret: 'input_secret_val',
                input_var_non_secret: 'input_non_secret_val',
              },
              streams: {
                'secrets.log': {
                  enabled: true,
                  vars: {
                    stream_var_secret: 'stream_secret_val',
                    stream_var_non_secret: 'stream_non_secret_val',
                  },
                },
              },
            },
          },
          vars: {
            package_var_secret: 'package_secret_val',
            package_var_non_secret: 'package_non_secret_val',
          },
          package: {
            name: 'secrets',
            version: '1.0.0',
          },
        })
        .expect(200);

      createdPackagePolicy = createResBody.item;
      createdPackagePolicyId = createdPackagePolicy.id;
      packageVarId = createdPackagePolicy.vars.package_var_secret.value.id;
      expect(packageVarId).to.be.an('string');
      inputVarId = createdPackagePolicy.inputs[0].vars.input_var_secret.value.id;
      expect(inputVarId).to.be.an('string');
      streamVarId = createdPackagePolicy.inputs[0].streams[0].vars.stream_var_secret.value.id;
      expect(streamVarId).to.be.an('string');

      expect(
        arrayIdsEqual(createdPackagePolicy.secret_references, [
          { id: packageVarId },
          { id: streamVarId },
          { id: inputVarId },
        ])
      ).to.eql(true);
      expectedCompiledStream = {
        'config.version': '2',
        package_var_secret: secretVar(packageVarId),
        package_var_non_secret: 'package_non_secret_val',
        input_var_secret: secretVar(inputVarId),
        input_var_non_secret: 'input_non_secret_val',
        stream_var_secret: secretVar(streamVarId),
        stream_var_non_secret: 'stream_non_secret_val',
      };
      expect(createdPackagePolicy.inputs[0].streams[0].compiled_stream).to.eql(
        expectedCompiledStream
      );

      expectedCompiledInput = {
        package_var_secret: secretVar(packageVarId),
        package_var_non_secret: 'package_non_secret_val',
        input_var_secret: secretVar(inputVarId),
        input_var_non_secret: 'input_non_secret_val',
      };

      expect(createdPackagePolicy.inputs[0].compiled_input).to.eql(expectedCompiledInput);

      expect(createdPackagePolicy.vars.package_var_secret.value.isSecretRef).to.eql(true);
      expect(createdPackagePolicy.inputs[0].vars.input_var_secret.value.isSecretRef).to.eql(true);
      expect(
        createdPackagePolicy.inputs[0].streams[0].vars.stream_var_secret.value.isSecretRef
      ).to.eql(true);
    });

    it('should return the policy correctly from the get policies API', async () => {
      const packagePolicy = await getPackagePolicyById(createdPackagePolicyId);
      expect(
        arrayIdsEqual(packagePolicy.secret_references, [
          { id: packageVarId },
          { id: streamVarId },
          { id: inputVarId },
        ])
      ).to.eql(true);
      expect(packagePolicy.inputs[0].streams[0].compiled_stream).to.eql(expectedCompiledStream);
      expect(packagePolicy.inputs[0].compiled_input).to.eql(expectedCompiledInput);
      expect(packagePolicy.vars.package_var_secret.value.isSecretRef).to.eql(true);
      expect(packagePolicy.vars.package_var_secret.value.id).eql(packageVarId);
      expect(packagePolicy.inputs[0].vars.input_var_secret.value.isSecretRef).to.eql(true);
      expect(packagePolicy.inputs[0].vars.input_var_secret.value.id).eql(inputVarId);
      expect(packagePolicy.inputs[0].streams[0].vars.stream_var_secret.value.isSecretRef).to.eql(
        true
      );
      expect(packagePolicy.inputs[0].streams[0].vars.stream_var_secret.value.id).eql(streamVarId);
    });

    it('Should return output secrets if policy uses output with secrets', async () => {
      // Output secrets require at least one Fleet server on 8.12.0 or higher (and none under 8.12.0).
      await createFleetServerAgent(fleetServerAgentPolicyId, 'server_1', '8.12.0');
      const outputWithSecret = await createOutputWithSecret();

      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `Test policy ${uuidv4()}`,
          namespace: 'default',
          data_output_id: outputWithSecret.id,
          monitoring_output_id: outputWithSecret.id,
        })
        .expect(200);

      const fullAgentPolicy = await getFullAgentPolicyById(agentPolicyResponse.item.id);

      const passwordSecretId = outputWithSecret!.secrets?.password?.id;

      expect(fullAgentPolicy.secret_references).to.eql([{ id: passwordSecretId }]);

      const output = Object.entries(fullAgentPolicy.outputs)[0][1];
      // @ts-expect-error
      expect(output.secrets.password.id).to.eql(passwordSecretId);

      // delete output with secret
      await supertest
        .delete(`/api/fleet/outputs/${outputWithSecret.id}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    });

    it('should have correctly created the secrets', async () => {
      const searchRes = await getSecrets([packageVarId, inputVarId, streamVarId]);

      expect(searchRes.hits.hits.length).to.eql(3);

      const secretValuesById = searchRes.hits.hits.reduce((acc: any, secret: any) => {
        acc[secret._id] = secret._source.value;
        return acc;
      }, {});
      expect(secretValuesById[packageVarId]).to.eql('package_secret_val');
      expect(secretValuesById[inputVarId]).to.eql('input_secret_val');
      expect(secretValuesById[streamVarId]).to.eql('stream_secret_val');
    });

    it('should have written the secrets to the .fleet-policies index', async () => {
      const { data: policyDoc } = await getLatestPolicyRevision(agentPolicyId);
      expectCompiledPolicyVars(policyDoc);
    });

    it('should return secret refs from agent policy API', async () => {
      const agentPolicy = await getFullAgentPolicyById(agentPolicyId);

      expectCompiledPolicyVars(agentPolicy);
    });

    it('should allow secret values to be updated (single policy update API)', async () => {
      const updatedPolicy = createdPolicyToUpdatePolicy(createdPackagePolicy);
      updatedPolicy.vars.package_var_secret.value = 'new_package_secret_val';

      const updateRes = await supertest
        .put(`/api/fleet/package_policies/${createdPackagePolicyId}`)
        .set('kbn-xsrf', 'xxxx')
        .send(updatedPolicy)
        .expect(200);

      const updatedPackagePolicy = updateRes.body.item;

      updatedPackageVarId = updatedPackagePolicy.vars.package_var_secret.value.id;
      expect(updatedPackageVarId).to.be.an('string');
      expect(
        arrayIdsEqual(updatedPackagePolicy.secret_references, [
          { id: updatedPackageVarId },
          { id: streamVarId },
          { id: inputVarId },
        ])
      ).to.eql(true);
      expect(updatedPackagePolicy.inputs[0].streams[0].compiled_stream).to.eql({
        'config.version': 2,
        package_var_secret: secretVar(updatedPackageVarId),
        package_var_non_secret: 'package_non_secret_val',
        input_var_secret: secretVar(inputVarId),
        input_var_non_secret: 'input_non_secret_val',
        stream_var_secret: secretVar(streamVarId),
        stream_var_non_secret: 'stream_non_secret_val',
      });
      expect(updatedPackagePolicy.inputs[0].compiled_input).to.eql({
        package_var_secret: secretVar(updatedPackageVarId),
        package_var_non_secret: 'package_non_secret_val',
        input_var_secret: secretVar(inputVarId),
        input_var_non_secret: 'input_non_secret_val',
      });
      expect(updatedPackagePolicy.vars.package_var_secret.value.isSecretRef).to.eql(true);
      expect(updatedPackagePolicy.vars.package_var_secret.value.id).eql(updatedPackageVarId);
      expect(updatedPackagePolicy.inputs[0].vars.input_var_secret.value.isSecretRef).to.eql(true);
      expect(updatedPackagePolicy.inputs[0].vars.input_var_secret.value.id).eql(inputVarId);
      expect(
        updatedPackagePolicy.inputs[0].streams[0].vars.stream_var_secret.value.isSecretRef
      ).to.eql(true);
      expect(updatedPackagePolicy.inputs[0].streams[0].vars.stream_var_secret.value.id).eql(
        streamVarId
      );
    });

    it('should have correctly deleted unused secrets after update', async () => {
      const searchRes = await getSecrets();

      expect(searchRes.hits.hits.length).to.eql(3); // should have created 1 and deleted 1 doc

      const secretValuesById = searchRes.hits.hits.reduce((acc: any, secret: any) => {
        acc[secret._id] = secret._source.value;
        return acc;
      }, {});
      expect(secretValuesById[updatedPackageVarId]).to.eql('new_package_secret_val');
      expect(secretValuesById[inputVarId]).to.eql('input_secret_val');
      expect(secretValuesById[streamVarId]).to.eql('stream_secret_val');
    });

    it('should not duplicate secrets after duplicating agent policy', async () => {
      const { body: agentPolicy } = await supertest
        .post(`/api/fleet/agent_policies/${agentPolicyId}/copy`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'copy',
        })
        .expect(200);

      duplicatedAgentPolicyId = agentPolicy.item.id;

      const { data: policyDoc } = await getLatestPolicyRevision(duplicatedAgentPolicyId);

      duplicatedPackagePolicyId = policyDoc.inputs[0].package_policy_id;

      expectCompiledPolicyVars(policyDoc, updatedPackageVarId);

      const searchRes = await getSecrets();

      expect(searchRes.hits.hits.length).to.eql(3);

      const secretValuesById = searchRes.hits.hits.reduce((acc: any, secret: any) => {
        acc[secret._id] = secret._source.value;
        return acc;
      }, {});

      expect(secretValuesById[updatedPackageVarId]).to.eql('new_package_secret_val');
      expect(secretValuesById[inputVarId]).to.eql('input_secret_val');
      expect(secretValuesById[streamVarId]).to.eql('stream_secret_val');
    });

    it('should not delete used secrets on secret update', async () => {
      const updatedPolicy = createdPolicyToUpdatePolicy(createdPackagePolicy);
      delete updatedPolicy.name;

      updatedPolicy.vars.package_var_secret.value = 'new_package_secret_val_2';

      const updateRes = await supertest
        .put(`/api/fleet/package_policies/${duplicatedPackagePolicyId}`)
        .set('kbn-xsrf', 'xxxx')
        .send(updatedPolicy)
        .expect(200);

      const updatedPackagePolicy = updateRes.body.item;

      const packageVarSecretIds = [
        updatedPackagePolicy.vars.package_var_secret.value.id,
        updatedPackageVarId,
      ];
      const searchRes = await getSecrets(packageVarSecretIds);

      expect(searchRes.hits.hits.length).to.eql(2);
    });

    it('should not delete used secrets on package policy delete', async () => {
      await supertest
        .delete(`/api/fleet/package_policies/${duplicatedPackagePolicyId}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      // sleep to allow for secrets to be deleted
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const searchRes = await getSecrets();

      // should have deleted new_package_secret_val_2
      expect(searchRes.hits.hits.length).to.eql(3);
    });

    it('should delete all secrets on package policy delete', async () => {
      await supertest
        .delete(`/api/fleet/package_policies/${createdPackagePolicyId}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      for (let i = 0; i < 3; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const searchRes = await getSecrets();
        if (searchRes.hits.hits.length === 0) {
          return;
        }
      }

      throw new Error('Secrets not deleted');
    });

    it('should not store secrets if fleet server does not meet minimum version', async () => {
      await createFleetServerAgent(fleetServerAgentPolicyId, 'server_1', '7.0.0');
      await disableSecrets();

      const createdPolicy = await createPolicyWSecretVar();

      // secret should be in plain text i.e not a secret refrerence
      expect(createdPolicy.vars.package_var_secret.value).eql('package_secret_val');
    });

    it('should not store secrets if there are no fleet servers', async () => {
      await clearAgents();

      const createdPolicy = await createPolicyWSecretVar();

      // secret should be in plain text i.e not a secret refrerence
      expect(createdPolicy.vars.package_var_secret.value).eql('package_secret_val');
    });

    it('should convert plain text values to secrets once fleet server requirements are met', async () => {
      await clearAgents();

      const createdPolicy = await createPolicyWSecretVar();

      await createFleetServerAgent(fleetServerAgentPolicyId, 'server_2', '9.0.0');

      const updatedPolicy = createdPolicyToUpdatePolicy(createdPolicy);
      delete updatedPolicy.name;

      updatedPolicy.vars.package_var_secret.value = 'package_secret_val_2';

      const updateRes = await supertest
        .put(`/api/fleet/package_policies/${createdPolicy.id}`)
        .set('kbn-xsrf', 'xxxx')
        .send(updatedPolicy)
        .expect(200);

      const updatedPolicyRes = updateRes.body.item;

      expect(updatedPolicyRes.vars.package_var_secret.value.isSecretRef).eql(true);
      expect(updatedPolicyRes.inputs[0].vars.input_var_secret.value.isSecretRef).eql(true);
      expect(updatedPolicyRes.inputs[0].streams[0].vars.stream_var_secret.value.isSecretRef).eql(
        true
      );
    });

    it('should not revert to plaintext values if the user adds an out of date fleet server', async () => {
      await createFleetServerAgent(fleetServerAgentPolicyId, 'server_3', '7.0.0');

      const createdPolicy = await createPolicyWSecretVar();

      expect(createdPolicy.vars.package_var_secret.value.isSecretRef).eql(true);
    });

    it('should store new secrets after package upgrade', async () => {
      const createdPolicy = await createPolicyWSecretVar();

      // Install newer version of secrets package
      await supertest
        .post('/api/fleet/epm/packages/secrets/1.1.0')
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);

      // Upgrade package policy
      await supertest
        .post(`/api/fleet/package_policies/upgrade`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          packagePolicyIds: [createdPolicy.id],
        })
        .expect(200);

      // Fetch policy again
      const res = await supertest.get(`/api/fleet/package_policies/${createdPolicy.id}`);
      const upgradedPolicy = res.body.item;

      const packageSecretVarId = upgradedPolicy.vars.package_var_secret.value.id;
      const packageNonSecretVarId = upgradedPolicy.vars.package_var_non_secret.value.id;
      const inputSecretVarId = upgradedPolicy.inputs[0].vars.input_var_secret.value.id;
      const inputNonSecretVarId = upgradedPolicy.inputs[0].vars.input_var_non_secret.value.id;
      const streamSecretVarId = upgradedPolicy.inputs[0].streams[0].vars.stream_var_secret.value.id;
      const streamNonSecretVarId =
        upgradedPolicy.inputs[0].streams[0].vars.stream_var_non_secret.value.id;

      expect(
        arrayIdsEqual(upgradedPolicy.secret_references, [
          { id: packageSecretVarId },
          { id: packageNonSecretVarId },
          { id: inputSecretVarId },
          { id: inputNonSecretVarId },
          { id: streamSecretVarId },
          { id: streamNonSecretVarId },
        ])
      ).to.eql(true);

      expect(upgradedPolicy.inputs[0].compiled_input).to.eql({
        package_var_secret: secretVar(packageSecretVarId),
        package_var_non_secret: secretVar(packageNonSecretVarId),
        input_var_secret: secretVar(inputSecretVarId),
        input_var_non_secret: secretVar(inputNonSecretVarId),
      });

      expect(upgradedPolicy.inputs[0].streams[0].compiled_stream).to.eql({
        'config.version': '2',
        package_var_secret: secretVar(packageSecretVarId),
        package_var_non_secret: secretVar(packageNonSecretVarId),
        input_var_secret: secretVar(inputSecretVarId),
        input_var_non_secret: secretVar(inputNonSecretVarId),
        stream_var_secret: secretVar(streamSecretVarId),
        stream_var_non_secret: secretVar(streamNonSecretVarId),
      });

      expect(upgradedPolicy.vars.package_var_secret.value.isSecretRef).to.eql(true);
      expect(upgradedPolicy.vars.package_var_non_secret.value.isSecretRef).to.eql(true);
      expect(upgradedPolicy.inputs[0].vars.input_var_secret.value.isSecretRef).to.eql(true);
      expect(upgradedPolicy.inputs[0].vars.input_var_non_secret.value.isSecretRef).to.eql(true);
      expect(upgradedPolicy.inputs[0].streams[0].vars.stream_var_secret.value.isSecretRef).to.eql(
        true
      );
      expect(
        upgradedPolicy.inputs[0].streams[0].vars.stream_var_non_secret.value.isSecretRef
      ).to.eql(true);
    });
  });
}
