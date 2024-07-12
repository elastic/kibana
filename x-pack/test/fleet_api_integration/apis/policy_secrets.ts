/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import expect from '@kbn/expect';
import { FullAgentPolicy } from '@kbn/fleet-plugin/common';
import {
  AGENTS_INDEX,
  AGENT_POLICY_INDEX,
  ENROLLMENT_API_KEYS_INDEX,
  GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common/constants';
import moment from 'moment';
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
    const kibanaServer = getService('kibanaServer');
    const supertest = getService('supertest');

    const createAgentPolicy = async () => {
      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `Test policy ${uuidv4()}`,
          namespace: 'default',
        })
        .expect(200);

      return agentPolicyResponse.item;
    };

    const deletePackagePolicy = async (id: string) => {
      await supertest
        .delete(`/api/fleet/package_policies/${id}?force=true`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    };

    const cleanupPolicies = async () => {
      const agentPoliciesRes = await supertest
        .get(`/api/fleet/agent_policies?perPage=1000`)
        .expect(200);

      const packagePoliciesRes = await supertest
        .get(`/api/fleet/package_policies?perPage=1000`)
        .expect(200);

      const packagePolicies = packagePoliciesRes.body.items;

      for (const packagePolicy of packagePolicies) {
        await supertest
          .delete(`/api/fleet/package_policies/${packagePolicy.id}?force=true`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      }

      const agentPolicies = agentPoliciesRes.body.items;

      for (const agentPolicy of agentPolicies) {
        if (agentPolicy.is_managed) {
          continue;
        }

        await supertest
          .post(`/api/fleet/agent_policies/delete`)
          .send({
            agentPolicyId: agentPolicy.id,
          })
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      }

      try {
        await es.deleteByQuery({
          index: ENROLLMENT_API_KEYS_INDEX,
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

      try {
        await es.deleteByQuery({
          index: AGENT_POLICY_INDEX,
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

    const cleanupAgents = async () => {
      try {
        await es.deleteByQuery({
          index: AGENTS_INDEX,
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

    const cleanupSecrets = async () => {
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

      // Reset the global settings object to disable secrets between tests.
      // Each test can re-run setup as part of its setup if it needs to enable secrets
      await kibanaServer.savedObjects.update({
        type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
        id: 'fleet-default-settings',
        attributes: {
          secret_storage_requirements_met: false,
        },
        overwrite: false,
      });
    };

    const createFleetServerAgentPolicy = async ({
      isManaged = false,
    }: { isManaged?: boolean } = {}) => {
      const agentPolicyResponse = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxx')
        .send({
          name: `Fleet server policy ${uuidv4()}`,
          namespace: 'default',
          is_managed: isManaged,
        })
        .expect(200);

      const fleetServerAgentPolicy = agentPolicyResponse.body.item;

      // create fleet_server package policy
      const fleetServerPackagePolicyResponse = await supertest
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
          policy_id: fleetServerAgentPolicy.id,
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

      const fleetServerPackagePolicy = fleetServerPackagePolicyResponse.body.item;

      return { fleetServerAgentPolicy, fleetServerPackagePolicy };
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

    const createFleetServerAgent = async (
      policyId: string,
      hostname: string,
      agentVersion: string,
      status = 'active'
    ) => {
      const agentResponse = await es.index({
        index: '.fleet-agents',
        refresh: true,
        body: {
          access_api_key_id: 'api-key-3',
          active: true,
          policy_id: policyId,
          type: 'PERMANENT',
          local_metadata: {
            host: { hostname },
            elastic: { agent: { version: agentVersion } },
          },
          user_provided_metadata: {},
          enrolled_at: moment().subtract(30, 'minutes').toISOString(),
          unenrolled_at:
            status === 'unenrolled' ? moment().subtract(10, 'minutes').toISOString() : undefined,
          last_checkin:
            status === 'inactive'
              ? moment().subtract(2, 'hours')
              : moment().subtract(5, 'minute').toISOString(),
          tags: ['tag1'],
          status,
        },
      });

      return agentResponse._id;
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

    const getPackagePolicyById = async (id: string) => {
      const { body } = await supertest.get(`/api/fleet/package_policies/${id}`);
      return body.item;
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

    const createPackagePolicyWithSecrets = async (agentPolicyId: string) => {
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
        });

      const packagePolicyWithSecrets = createResBody.item;

      return packagePolicyWithSecrets;
    };

    const callFleetSetup = async () => {
      await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxxx').expect(200);
    };

    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    before(async () => {
      await getService('esArchiver').load(
        'x-pack/test/functional/es_archives/fleet/empty_fleet_server'
      );
    });

    after(async () => {
      await getService('esArchiver').unload(
        'x-pack/test/functional/es_archives/fleet/empty_fleet_server'
      );
    });

    afterEach(async () => {
      await cleanupAgents();
      await cleanupPolicies();
      await cleanupSecrets();
    });

    describe('create package policy with secrets', () => {
      let testAgentPolicy: any;
      let fleetServerAgentPolicy: any;
      let packagePolicyWithSecrets: any;

      beforeEach(async () => {
        // Policy secrets require at least one Fleet server on v8.10+
        const createFleetServerAgentPolicyRes = await createFleetServerAgentPolicy();
        fleetServerAgentPolicy = createFleetServerAgentPolicyRes.fleetServerAgentPolicy;

        await createFleetServerAgent(fleetServerAgentPolicy.id, 'server_1', '8.10.0');

        // Re-run setup to detect new Fleet Server agent + policy and enable secrets
        await callFleetSetup();

        testAgentPolicy = await createAgentPolicy();
        packagePolicyWithSecrets = await createPackagePolicyWithSecrets(testAgentPolicy.id);
      });

      it('should correctly create the policy with secrets', async () => {
        const packageVarId = packagePolicyWithSecrets.vars.package_var_secret.value.id;

        expect(packageVarId).to.be.an('string');

        const inputVarId = packagePolicyWithSecrets.inputs[0].vars.input_var_secret.value.id;
        expect(inputVarId).to.be.an('string');

        const streamVarId =
          packagePolicyWithSecrets.inputs[0].streams[0].vars.stream_var_secret.value.id;
        expect(streamVarId).to.be.an('string');

        expect(
          arrayIdsEqual(packagePolicyWithSecrets.secret_references, [
            { id: packageVarId },
            { id: streamVarId },
            { id: inputVarId },
          ])
        ).to.eql(true);

        const expectedCompiledStream = {
          'config.version': '2',
          package_var_secret: secretVar(packageVarId),
          package_var_non_secret: 'package_non_secret_val',
          input_var_secret: secretVar(inputVarId),
          input_var_non_secret: 'input_non_secret_val',
          stream_var_secret: secretVar(streamVarId),
          stream_var_non_secret: 'stream_non_secret_val',
        };

        expect(packagePolicyWithSecrets.inputs[0].streams[0].compiled_stream).to.eql(
          expectedCompiledStream
        );

        const expectedCompiledInput = {
          package_var_secret: secretVar(packageVarId),
          package_var_non_secret: 'package_non_secret_val',
          input_var_secret: secretVar(inputVarId),
          input_var_non_secret: 'input_non_secret_val',
        };

        expect(packagePolicyWithSecrets.inputs[0].compiled_input).to.eql(expectedCompiledInput);

        expect(packagePolicyWithSecrets.vars.package_var_secret.value.isSecretRef).to.eql(true);
        expect(packagePolicyWithSecrets.inputs[0].vars.input_var_secret.value.isSecretRef).to.eql(
          true
        );
        expect(
          packagePolicyWithSecrets.inputs[0].streams[0].vars.stream_var_secret.value.isSecretRef
        ).to.eql(true);
      });

      it('should return the created policy correctly from the get policies API', async () => {
        const packagePolicy = await getPackagePolicyById(packagePolicyWithSecrets.id);

        const packageVarId = packagePolicy.vars.package_var_secret.value.id;
        const inputVarId = packagePolicy.inputs[0].vars.input_var_secret.value.id;
        const streamVarId = packagePolicy.inputs[0].streams[0].vars.stream_var_secret.value.id;

        const expectedCompiledStream = {
          'config.version': '2',
          package_var_secret: secretVar(packageVarId),
          package_var_non_secret: 'package_non_secret_val',
          input_var_secret: secretVar(inputVarId),
          input_var_non_secret: 'input_non_secret_val',
          stream_var_secret: secretVar(streamVarId),
          stream_var_non_secret: 'stream_non_secret_val',
        };

        const expectedCompiledInput = {
          package_var_secret: secretVar(packageVarId),
          package_var_non_secret: 'package_non_secret_val',
          input_var_secret: secretVar(inputVarId),
          input_var_non_secret: 'input_non_secret_val',
        };

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
        const packageVarId = packagePolicyWithSecrets.vars.package_var_secret.value.id;
        const inputVarId = packagePolicyWithSecrets.inputs[0].vars.input_var_secret.value.id;
        const streamVarId =
          packagePolicyWithSecrets.inputs[0].streams[0].vars.stream_var_secret.value.id;

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
        const { data: policyDoc } = await getLatestPolicyRevision(testAgentPolicy.id);

        const packageVarId = packagePolicyWithSecrets.vars.package_var_secret.value.id;
        const inputVarId = packagePolicyWithSecrets.inputs[0].vars.input_var_secret.value.id;
        const streamVarId =
          packagePolicyWithSecrets.inputs[0].streams[0].vars.stream_var_secret.value.id;

        expect(
          arrayIdsEqual(policyDoc.secret_references!, [
            {
              id: packageVarId,
            },
            {
              id: inputVarId,
            },
            {
              id: streamVarId,
            },
          ])
        ).to.eql(true);

        expect(policyDoc.inputs[0].package_var_secret).to.eql(secretVar(packageVarId));
        expect(policyDoc.inputs[0].input_var_secret).to.eql(secretVar(inputVarId));
        expect(policyDoc.inputs[0].streams![0].package_var_secret).to.eql(secretVar(packageVarId));
        expect(policyDoc.inputs[0].streams![0].input_var_secret).to.eql(secretVar(inputVarId));
        expect(policyDoc.inputs[0].streams![0].stream_var_secret).to.eql(secretVar(streamVarId));
      });

      it('should return secret refs from agent policy API', async () => {
        const agentPolicy = await getFullAgentPolicyById(testAgentPolicy.id);

        const input = agentPolicy.inputs[0];

        const packageVarId = packagePolicyWithSecrets.vars.package_var_secret.value.id;
        const inputVarId = packagePolicyWithSecrets.inputs[0].vars.input_var_secret.value.id;
        const streamVarId =
          packagePolicyWithSecrets.inputs[0].streams[0].vars.stream_var_secret.value.id;

        expect(
          arrayIdsEqual(agentPolicy.secret_references!, [
            {
              id: packageVarId,
            },
            {
              id: inputVarId,
            },
            {
              id: streamVarId,
            },
          ])
        ).to.eql(true);

        expect(input.package_var_secret).to.eql(secretVar(packageVarId));
        expect(input.input_var_secret).to.eql(secretVar(inputVarId));
        expect(input.streams[0].package_var_secret).to.eql(secretVar(packageVarId));
        expect(input.streams[0].input_var_secret).to.eql(secretVar(inputVarId));
        expect(input.streams[0].stream_var_secret).to.eql(secretVar(streamVarId));
      });
    });

    describe('update package policy with secrets', () => {
      let testAgentPolicy: any;
      let fleetServerAgentPolicy: any;
      let packagePolicyWithSecrets: any;
      let updatedPackagePolicy: any;

      beforeEach(async () => {
        // Policy secrets require at least one Fleet server on v8.10+
        const createFleetServerAgentPolicyRes = await createFleetServerAgentPolicy();
        fleetServerAgentPolicy = createFleetServerAgentPolicyRes.fleetServerAgentPolicy;

        await createFleetServerAgent(fleetServerAgentPolicy.id, 'server_1', '8.10.0');

        // Re-run setup to detect new Fleet Server agent + policy and enable secrets
        await callFleetSetup();

        testAgentPolicy = await createAgentPolicy();
        packagePolicyWithSecrets = await createPackagePolicyWithSecrets(testAgentPolicy.id);

        const updatedPolicy = createdPolicyToUpdatePolicy(packagePolicyWithSecrets);
        updatedPolicy.vars.package_var_secret.value = 'new_package_secret_val';

        const updateRes = await supertest
          .put(`/api/fleet/package_policies/${packagePolicyWithSecrets.id}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updatedPolicy)
          .expect(200);

        updatedPackagePolicy = updateRes.body.item;
      });

      it('should allow secret values to be updated (single policy update API)', async () => {
        const updatedPackageVarId = updatedPackagePolicy.vars.package_var_secret.value.id;
        expect(updatedPackageVarId).to.be.a('string');

        const inputVarId = packagePolicyWithSecrets.inputs[0].vars.input_var_secret.value.id;
        const streamVarId =
          packagePolicyWithSecrets.inputs[0].streams[0].vars.stream_var_secret.value.id;

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

        const updatedPackageVarId = updatedPackagePolicy.vars.package_var_secret.value.id;
        expect(updatedPackageVarId).to.be.a('string');

        const inputVarId = packagePolicyWithSecrets.inputs[0].vars.input_var_secret.value.id;
        const streamVarId =
          packagePolicyWithSecrets.inputs[0].streams[0].vars.stream_var_secret.value.id;

        expect(secretValuesById[updatedPackageVarId]).to.eql('new_package_secret_val');
        expect(secretValuesById[inputVarId]).to.eql('input_secret_val');
        expect(secretValuesById[streamVarId]).to.eql('stream_secret_val');
      });
    });

    describe('copy agent policy with secrets', () => {
      let testAgentPolicy: any;
      let fleetServerAgentPolicy: any;
      let packagePolicyWithSecrets: any;
      let policyDoc: any;
      let duplicatedAgentPolicy: any;
      let duplicatedPackagePolicy: any;

      beforeEach(async () => {
        // Policy secrets require at least one Fleet server on v8.10+
        const createFleetServerAgentPolicyRes = await createFleetServerAgentPolicy();
        fleetServerAgentPolicy = createFleetServerAgentPolicyRes.fleetServerAgentPolicy;

        await createFleetServerAgent(fleetServerAgentPolicy.id, 'server_1', '8.10.0');

        // Re-run setup to detect new Fleet Server agent + policy and enable secrets
        await callFleetSetup();

        testAgentPolicy = await createAgentPolicy();
        packagePolicyWithSecrets = await createPackagePolicyWithSecrets(testAgentPolicy.id);

        const { body: agentPolicy } = await supertest
          .post(`/api/fleet/agent_policies/${testAgentPolicy.id}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `${testAgentPolicy.id} copy`,
          })
          .expect(200);

        duplicatedAgentPolicy = agentPolicy.item;

        const { data } = await getLatestPolicyRevision(duplicatedAgentPolicy.id);
        policyDoc = data;

        duplicatedPackagePolicy = duplicatedAgentPolicy.package_policies[0];
      });

      it('should not duplicate secrets after duplicating agent policy', async () => {
        const packageVarId = duplicatedPackagePolicy.vars.package_var_secret.value.id;
        const inputVarId = duplicatedPackagePolicy.inputs[0].vars.input_var_secret.value.id;
        const streamVarId =
          duplicatedPackagePolicy.inputs[0].streams[0].vars.stream_var_secret.value.id;

        expect(
          arrayIdsEqual(policyDoc.secret_references!, [
            {
              id: packageVarId,
            },
            {
              id: inputVarId,
            },
            {
              id: streamVarId,
            },
          ])
        ).to.eql(true);

        expect(policyDoc.inputs[0].package_var_secret).to.eql(secretVar(packageVarId));
        expect(policyDoc.inputs[0].input_var_secret).to.eql(secretVar(inputVarId));
        expect(policyDoc.inputs[0].streams![0].package_var_secret).to.eql(secretVar(packageVarId));
        expect(policyDoc.inputs[0].streams![0].input_var_secret).to.eql(secretVar(inputVarId));
        expect(policyDoc.inputs[0].streams![0].stream_var_secret).to.eql(secretVar(streamVarId));

        const searchRes = await getSecrets();

        expect(searchRes.hits.hits.length).to.eql(3);

        const secretValuesById = searchRes.hits.hits.reduce((acc: any, secret: any) => {
          acc[secret._id] = secret._source.value;
          return acc;
        }, {});

        expect(secretValuesById[packageVarId]).to.eql('package_secret_val');
        expect(secretValuesById[inputVarId]).to.eql('input_secret_val');
        expect(secretValuesById[streamVarId]).to.eql('stream_secret_val');
      });

      it('should not delete used secrets on secret update', async () => {
        const updatedPolicy = createdPolicyToUpdatePolicy(duplicatedPackagePolicy);
        delete updatedPolicy.name;

        updatedPolicy.vars.package_var_secret.value = 'new_package_secret_val_2';

        const updateRes = await supertest
          .put(`/api/fleet/package_policies/${duplicatedPackagePolicy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updatedPolicy)
          .expect(200);

        const updatedPackagePolicy = updateRes.body.item;
        const updatedPackageVarId = updatedPackagePolicy.vars.package_var_secret.value.id;

        const packageVarSecretIds = [
          packagePolicyWithSecrets.vars.package_var_secret.value.id,
          updatedPackageVarId,
        ];

        const searchRes = await getSecrets(packageVarSecretIds);

        expect(searchRes.hits.hits.length).to.eql(2);
      });

      it('should not delete used secrets on delete of duplicated package policy', async () => {
        await supertest
          .delete(`/api/fleet/package_policies/${duplicatedPackagePolicy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        // sleep to allow for secrets to be deleted
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const searchRes = await getSecrets();

        // should have deleted new_package_secret_val_2
        expect(searchRes.hits.hits.length).to.eql(3);
      });
    });

    describe('delete package policy', () => {
      let testAgentPolicy: any;
      let fleetServerAgentPolicy: any;
      let packagePolicyWithSecrets: any;

      beforeEach(async () => {
        // Policy secrets require at least one Fleet server on v8.10+
        const createFleetServerAgentPolicyRes = await createFleetServerAgentPolicy();
        fleetServerAgentPolicy = createFleetServerAgentPolicyRes.fleetServerAgentPolicy;

        await createFleetServerAgent(fleetServerAgentPolicy.id, 'server_1', '8.10.0');

        // Re-run setup to detect new Fleet Server agent + policy and enable secrets
        await callFleetSetup();

        testAgentPolicy = await createAgentPolicy();
        packagePolicyWithSecrets = await createPackagePolicyWithSecrets(testAgentPolicy.id);
      });

      it('should delete all secrets on package policy delete', async () => {
        await deletePackagePolicy(packagePolicyWithSecrets.id);

        for (let i = 0; i < 3; i++) {
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const searchRes = await getSecrets();
          if (searchRes.hits.hits.length === 0) {
            return;
          }
        }

        throw new Error('Secrets not deleted');
      });
    });

    describe('fleet server version requirements', () => {
      it('should not store secrets if fleet server does not meet minimum version', async () => {
        const { fleetServerAgentPolicy } = await createFleetServerAgentPolicy();
        await createFleetServerAgent(fleetServerAgentPolicy.id, 'server_1', '7.0.0');
        const { fleetServerAgentPolicy: fleetServerPolicy2 } = await createFleetServerAgentPolicy(); // extra policy to verify `or` condition
        await createFleetServerAgent(fleetServerPolicy2.id, 'server_1', '8.12.0');

        await callFleetSetup();

        const agentPolicy = await createAgentPolicy();
        const packagePolicyWithSecrets = await createPackagePolicyWithSecrets(agentPolicy.id);

        // secrets should be in plain text i.e not a secret reference
        expect(packagePolicyWithSecrets.vars.package_var_secret.value).eql('package_secret_val');
        expect(packagePolicyWithSecrets.inputs[0].vars.input_var_secret.value).eql(
          'input_secret_val'
        );

        expect(packagePolicyWithSecrets.inputs[0].streams[0].vars.stream_var_secret.value).eql(
          'stream_secret_val'
        );
      });

      it('should not store secrets if there are no fleet servers', async () => {
        await createFleetServerAgentPolicy();
        const agentPolicy = await createAgentPolicy();
        // agent with new version shouldn't make storage secrets enabled
        await createFleetServerAgent(agentPolicy.id, 'server_2', '8.12.0');
        const packagePolicyWithSecrets = await createPackagePolicyWithSecrets(agentPolicy.id);

        // secret should be in plain text i.e not a secret refrerence
        expect(packagePolicyWithSecrets.vars.package_var_secret.value).eql('package_secret_val');
      });

      it('should convert plain text values to secrets once fleet server requirements are met', async () => {
        const agentPolicy = await createAgentPolicy();
        const packagePolicyWithSecrets = await createPackagePolicyWithSecrets(agentPolicy.id);

        expect(packagePolicyWithSecrets.vars.package_var_secret.value).eql('package_secret_val');
        expect(packagePolicyWithSecrets.inputs[0].vars.input_var_secret.value).eql(
          'input_secret_val'
        );
        expect(packagePolicyWithSecrets.inputs[0].streams[0].vars.stream_var_secret.value).eql(
          'stream_secret_val'
        );

        const { fleetServerAgentPolicy } = await createFleetServerAgentPolicy();
        await createFleetServerAgent(fleetServerAgentPolicy.id, 'server_1', '8.12.0');
        await callFleetSetup();

        const updatedPolicy = createdPolicyToUpdatePolicy(packagePolicyWithSecrets);
        delete updatedPolicy.name;

        updatedPolicy.vars.package_var_secret.value = 'package_secret_val_2';

        const updateRes = await supertest
          .put(`/api/fleet/package_policies/${packagePolicyWithSecrets.id}`)
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
        const agentPolicy = await createAgentPolicy();
        const { fleetServerAgentPolicy } = await createFleetServerAgentPolicy();
        await createFleetServerAgent(fleetServerAgentPolicy.id, 'server_1', '8.12.0');
        await callFleetSetup();

        const packagePolicyWithSecrets = await createPackagePolicyWithSecrets(agentPolicy.id);

        expect(packagePolicyWithSecrets.vars.package_var_secret.value.isSecretRef).eql(true);
        expect(packagePolicyWithSecrets.inputs[0].vars.input_var_secret.value.isSecretRef).eql(
          true
        );
        expect(
          packagePolicyWithSecrets.inputs[0].streams[0].vars.stream_var_secret.value.isSecretRef
        ).eql(true);

        await createFleetServerAgent(fleetServerAgentPolicy.id, 'server_3', '7.0.0');

        const refetchedPackagePolicyWithSecrets = await supertest.get(
          `/api/fleet/package_policies/${packagePolicyWithSecrets.id}`
        );

        const refetchedPackagePolicy = refetchedPackagePolicyWithSecrets.body.item;

        expect(refetchedPackagePolicy.vars.package_var_secret.value.isSecretRef).eql(true);
        expect(refetchedPackagePolicy.inputs[0].vars.input_var_secret.value.isSecretRef).eql(true);
        expect(
          refetchedPackagePolicy.inputs[0].streams[0].vars.stream_var_secret.value.isSecretRef
        ).eql(true);
      });

      it('should store new secrets after package upgrade', async () => {
        const agentPolicy = await createAgentPolicy();

        const { fleetServerAgentPolicy } = await createFleetServerAgentPolicy();
        await createFleetServerAgent(fleetServerAgentPolicy.id, 'server_3', '8.12.0');
        await callFleetSetup();

        const packagePolicyWithSecrets = await createPackagePolicyWithSecrets(agentPolicy.id);

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
            packagePolicyIds: [packagePolicyWithSecrets.id],
          })
          .expect(200);

        // Fetch policy again
        const res = await supertest.get(
          `/api/fleet/package_policies/${packagePolicyWithSecrets.id}`
        );

        const upgradedPolicy = res.body.item;

        const packageSecretVarId = upgradedPolicy.vars.package_var_secret.value.id;
        const packageNonSecretVarId = upgradedPolicy.vars.package_var_non_secret.value.id;
        const inputSecretVarId = upgradedPolicy.inputs[0].vars.input_var_secret.value.id;
        const inputNonSecretVarId = upgradedPolicy.inputs[0].vars.input_var_non_secret.value.id;
        const streamSecretVarId =
          upgradedPolicy.inputs[0].streams[0].vars.stream_var_secret.value.id;
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

      it('should store secrets if additional fleet server does not meet minimum version, but is unenrolled', async () => {
        const { fleetServerAgentPolicy } = await createFleetServerAgentPolicy();
        await createFleetServerAgent(fleetServerAgentPolicy.id, 'server_1', '8.12.0');
        await createFleetServerAgent(fleetServerAgentPolicy.id, 'server_2', '7.0.0', 'unenrolled');

        await callFleetSetup();

        const agentPolicy = await createAgentPolicy();
        const packagePolicyWithSecrets = await createPackagePolicyWithSecrets(agentPolicy.id);

        expect(packagePolicyWithSecrets.vars.package_var_secret.value.isSecretRef).to.eql(true);
        expect(packagePolicyWithSecrets.inputs[0].vars.input_var_secret.value.isSecretRef).to.eql(
          true
        );
        expect(
          packagePolicyWithSecrets.inputs[0].streams[0].vars.stream_var_secret.value.isSecretRef
        ).to.eql(true);
      });

      it('should not store secrets if additional fleet server does not meet minimum version, but is inactive', async () => {
        const { fleetServerAgentPolicy } = await createFleetServerAgentPolicy();
        await createFleetServerAgent(fleetServerAgentPolicy.id, 'server_1', '8.12.0');
        await createFleetServerAgent(fleetServerAgentPolicy.id, 'server_1', '7.0.0', 'inactive');

        await callFleetSetup();

        const agentPolicy = await createAgentPolicy();
        const packagePolicyWithSecrets = await createPackagePolicyWithSecrets(agentPolicy.id);

        expect(packagePolicyWithSecrets.vars.package_var_secret.value).eql('package_secret_val');
        expect(packagePolicyWithSecrets.inputs[0].vars.input_var_secret.value).eql(
          'input_secret_val'
        );
        expect(packagePolicyWithSecrets.inputs[0].streams[0].vars.stream_var_secret.value).eql(
          'stream_secret_val'
        );
      });

      describe('managed policies', () => {
        it('should store secrets if additional fleet server does not meet minimum version, but is inactive + managed', async () => {
          // Ensure default output exists
          await callFleetSetup();

          const { fleetServerAgentPolicy } = await createFleetServerAgentPolicy({
            isManaged: true,
          });
          await createFleetServerAgent(fleetServerAgentPolicy.id, 'server_1', '8.12.0');
          await createFleetServerAgent(fleetServerAgentPolicy.id, 'server_2', '7.0.0', 'inactive');

          await callFleetSetup();

          const agentPolicy = await createAgentPolicy();
          const packagePolicyWithSecrets = await createPackagePolicyWithSecrets(agentPolicy.id);

          expect(packagePolicyWithSecrets.vars.package_var_secret.value.isSecretRef).to.eql(true);

          expect(packagePolicyWithSecrets.inputs[0].vars.input_var_secret.value.isSecretRef).to.eql(
            true
          );

          // Managed policies can't be deleted easily, so we have to nuke SO's instead
          await kibanaServer.savedObjects.cleanStandardList();
        });

        it('should store secrets if fleet server does not meet minimum version, but is offline + managed', async () => {
          // Ensure default output exists
          await callFleetSetup();

          const { fleetServerAgentPolicy } = await createFleetServerAgentPolicy({
            isManaged: true,
          });
          await createFleetServerAgent(fleetServerAgentPolicy.id, 'server_1', '7.0.0', 'offline');

          await callFleetSetup();

          const agentPolicy = await createAgentPolicy();
          const packagePolicyWithSecrets = await createPackagePolicyWithSecrets(agentPolicy.id);

          expect(packagePolicyWithSecrets.vars.package_var_secret.value.isSecretRef).to.eql(true);
          expect(packagePolicyWithSecrets.inputs[0].vars.input_var_secret.value.isSecretRef).to.eql(
            true
          );
          expect(
            packagePolicyWithSecrets.inputs[0].streams[0].vars.stream_var_secret.value.isSecretRef
          ).to.eql(true);

          // Managed policies can't be deleted easily, so we have to nuke SO's instead
          await kibanaServer.savedObjects.cleanStandardList();
        });
      });
    });

    // TODO: Output secrets should be moved to another test suite
    it('should return output secrets if policy uses output with secrets', async () => {
      // Output secrets require at least one Fleet server on 8.12.0 or higher (and none under 8.12.0).
      const { fleetServerAgentPolicy } = await createFleetServerAgentPolicy();
      await createFleetServerAgent(fleetServerAgentPolicy.id, 'server_1', '8.12.0');
      await callFleetSetup();

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
  });
}
