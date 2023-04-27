/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../helpers';

const secretVar = (id) => `$co.elastic.secret{${id}}`;
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

    skipIfNoDockerRegistry(providerContext);
    let agentPolicyId: string;
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await getService('esArchiver').load(
        'x-pack/test/functional/es_archives/fleet/empty_fleet_server'
      );
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
    it('Should correctly create secrets', async () => {
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

      const createdPackagePolicy = createResBody.item;
      const packageVarId = createdPackagePolicy.vars.package_var_secret.value.id;
      expect(packageVarId).to.be.an('string');
      const inputVarId = createdPackagePolicy.inputs[0].vars.input_var_secret.value.id;
      expect(inputVarId).to.be.an('string');
      const streamVarId = createdPackagePolicy.inputs[0].streams[0].vars.stream_var_secret.value.id;
      expect(streamVarId).to.be.an('string');

      const expectedCompiledStream = {
        'config.version': 2,
        package_var_secret: secretVar(packageVarId),
        input_var_secret: secretVar(inputVarId),
        stream_var_secret: secretVar(streamVarId),
      };
      expect(createdPackagePolicy.inputs[0].streams[0].compiled_stream).to.eql(
        expectedCompiledStream
      );

      const expectedCompiledInput = {
        package_var_secret: secretVar(packageVarId),
        input_var_secret: secretVar(inputVarId),
      };

      expect(createdPackagePolicy.inputs[0].compiled_input).to.eql(expectedCompiledInput);

      expect(createdPackagePolicy.vars.package_var_secret.value.isSecretRef).to.eql(true);
      expect(createdPackagePolicy.inputs[0].vars.input_var_secret.value.isSecretRef).to.eql(true);
      expect(
        createdPackagePolicy.inputs[0].streams[0].vars.stream_var_secret.value.isSecretRef
      ).to.eql(true);

      const packagePolicy = await getPackagePolicyById(createResBody.item.id);
      expect(packagePolicy.inputs[0].streams[0].compiled_stream).to.eql(expectedCompiledStream);
      expect(packagePolicy.vars.package_var_secret.value.isSecretRef).to.eql(true);
      expect(packagePolicy.vars.package_var_secret.value.id).eql(packageVarId);
      expect(packagePolicy.inputs[0].vars.input_var_secret.value.isSecretRef).to.eql(true);
      expect(packagePolicy.inputs[0].vars.input_var_secret.value.id).eql(inputVarId);
      expect(packagePolicy.inputs[0].streams[0].vars.stream_var_secret.value.isSecretRef).to.eql(
        true
      );
      expect(packagePolicy.inputs[0].streams[0].vars.stream_var_secret.value.id).eql(streamVarId);

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
  });
}
