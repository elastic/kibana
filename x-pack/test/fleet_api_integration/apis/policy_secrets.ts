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

export default function (providerContext: FtrProviderContext) {
  describe('fleet policy secrets', () => {
    const { getService } = providerContext;

    const es: Client = getService('es');
    const supertest = getService('supertest');
    const kibanaServer = getService('kibanaServer');

    const getPackagePolicyById = async (id: string) => {
      const { body } = await supertest.get(`/api/fleet/package_policies/${id}`);
      return body.item;
    };

    const maybeCreateSecretsIndex = async () => {
      // create mock .secrets index for testing
      if (await es.indices.exists({ index: '.fleet-test-secrets' })) {
        await es.indices.delete({ index: '.fleet-test-secrets' });
      }
      await es.indices.create({
        index: '.fleet-test-secrets',
        body: {
          mappings: {
            properties: {
              value: {
                type: 'keyword',
              },
            },
          },
        },
      });
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
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await getService('esArchiver').load(
        'x-pack/test/functional/es_archives/fleet/empty_fleet_server'
      );
      await maybeCreateSecretsIndex();
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
              },
              streams: {
                'secrets.log': {
                  enabled: true,
                  vars: {
                    stream_var_secret: 'stream_secret_val',
                  },
                },
              },
            },
          },
          vars: {
            package_var_secret: 'package_secret_val',
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
        'config.version': 2,
        package_var_secret: secretVar(packageVarId),
        input_var_secret: secretVar(inputVarId),
        stream_var_secret: secretVar(streamVarId),
      };
      expect(createdPackagePolicy.inputs[0].streams[0].compiled_stream).to.eql(
        expectedCompiledStream
      );

      expectedCompiledInput = {
        package_var_secret: secretVar(packageVarId),
        input_var_secret: secretVar(inputVarId),
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

    it('should have correctly created the secrets', async () => {
      const searchRes = await es.search({
        index: '.fleet-test-secrets',
        body: {
          query: {
            ids: {
              values: [packageVarId, inputVarId, streamVarId],
            },
          },
        },
      });

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
        input_var_secret: secretVar(inputVarId),
        stream_var_secret: secretVar(streamVarId),
      });
      expect(updatedPackagePolicy.inputs[0].compiled_input).to.eql({
        package_var_secret: secretVar(updatedPackageVarId),
        input_var_secret: secretVar(inputVarId),
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
      const searchRes = await es.search({
        index: '.fleet-test-secrets',
        body: {
          query: {
            match_all: {},
          },
        },
      });

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

      const searchRes = await es.search({
        index: '.fleet-test-secrets',
        body: {
          query: {
            match_all: {},
          },
        },
      });

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

      const searchRes = await es.search({
        index: '.fleet-test-secrets',
        body: {
          query: {
            terms: {
              _id: packageVarSecretIds,
            },
          },
        },
      });

      expect(searchRes.hits.hits.length).to.eql(2);
    });

    it('should not delete used secrets on package policy delete', async () => {
      return supertest
        .delete(`/api/fleet/package_policies/${duplicatedPackagePolicyId}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      const searchRes = await es.search({
        index: '.fleet-test-secrets',
        body: {
          query: {
            match_all: {},
          },
        },
      });

      expect(searchRes.hits.hits.length).to.eql(3);
    });

    it('should delete all secrets on package policy delete', async () => {
      return supertest
        .delete(`/api/fleet/package_policies/${createdPackagePolicyId}`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      const searchRes = await es.search({
        index: '.fleet-test-secrets',
        body: {
          query: {
            match_all: {},
          },
        },
      });

      expect(searchRes.hits.hits.length).to.eql(0);
    });
  });
}
