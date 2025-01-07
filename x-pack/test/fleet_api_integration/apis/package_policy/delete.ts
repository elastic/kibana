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
  const kibanaServer = getService('kibanaServer');

  describe('Package Policy - delete', () => {
    skipIfNoDockerRegistry(providerContext);

    describe('Delete one', () => {
      let agentPolicy: any;
      let packagePolicy: any;
      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await getService('esArchiver').load(
          'x-pack/test/functional/es_archives/fleet/empty_fleet_server'
        );
      });
      beforeEach(async () => {
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
                force: true,
              });
          }
        }
        agentPolicy = agentPolicyResponse.body.item;

        const { body: packagePolicyResponse } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            id: 'filetest-1',
            name: 'filetest-1',
            description: '',
            namespace: 'default',
            policy_id: agentPolicy.id,
            enabled: true,
            inputs: [],
            package: {
              name: 'filetest',
              title: 'For File Tests',
              version: '0.1.0',
            },
          });

        packagePolicy = packagePolicyResponse.item;
      });

      afterEach(async () => {
        await supertest
          .post(`/api/fleet/agent_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId: agentPolicy.id });

        await supertest
          .post(`/api/fleet/package_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true, packagePolicyIds: [packagePolicy.id] });
      });
      after(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await getService('esArchiver').unload(
          'x-pack/test/functional/es_archives/fleet/empty_fleet_server'
        );
      });

      it('should fail on hosted agent policies', async () => {
        // update existing policy to hosted
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
        const { body: result } = await supertest
          .delete(`/api/fleet/package_policies/${packagePolicy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);

        expect(result.message).to.contain('Cannot remove integrations of hosted agent policy');

        // same, but with force
        await supertest
          .delete(`/api/fleet/package_policies/${packagePolicy.id}?force=true`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        // revert existing policy to regular
        await supertest
          .put(`/api/fleet/agent_policies/${agentPolicy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: agentPolicy.name,
            namespace: agentPolicy.namespace,
            is_managed: false,
            force: true,
          })
          .expect(200);
      });

      it('should work for regular policies', async function () {
        await supertest
          .delete(`/api/fleet/package_policies/${packagePolicy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      });

      it('should work if the package policy is already deleted', async function () {
        await supertest
          .delete(`/api/fleet/package_policies/${packagePolicy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        await supertest
          .delete(`/api/fleet/package_policies/${packagePolicy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      });

      it('should delete agent policy with package policy if supports_agentless', async function () {
        // update existing policy to supports_agentless
        await supertest
          .put(`/api/fleet/agent_policies/${agentPolicy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: agentPolicy.name,
            namespace: agentPolicy.namespace,
            supports_agentless: true,
          })
          .expect(200);

        await supertest
          .delete(`/api/fleet/package_policies/${packagePolicy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        await supertest.get(`/api/fleet/agent_policies/${agentPolicy.id}`).expect(200);
      });
    });
    describe('Delete bulk', () => {
      let agentPolicy: any;
      let packagePolicy: any;
      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await getService('esArchiver').load(
          'x-pack/test/functional/es_archives/fleet/empty_fleet_server'
        );
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
                force: true,
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
          .send({ force: true, packagePolicyIds: [packagePolicy.id] });

        await kibanaServer.savedObjects.cleanStandardList();
        await getService('esArchiver').unload(
          'x-pack/test/functional/es_archives/fleet/empty_fleet_server'
        );
      });

      it('should fail on hosted agent policies', async function () {
        // update existing policy to hosted
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
        expect(results[0].body.message).to.contain(
          'Cannot remove integrations of hosted agent policy'
        );

        // same, but with force
        const { body: resultsWithForce } = await supertest
          .post(`/api/fleet/package_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ force: true, packagePolicyIds: [packagePolicy.id] })
          .expect(200);

        // delete always succeeds (returns 200) with Array<{success: boolean}>
        expect(Array.isArray(resultsWithForce));
        expect(resultsWithForce.length).to.be(1);
        expect(resultsWithForce[0].success).to.be(true);

        // revert existing policy to regular
        await supertest
          .put(`/api/fleet/agent_policies/${agentPolicy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: agentPolicy.name,
            namespace: agentPolicy.namespace,
            is_managed: false,
            force: true,
          })
          .expect(200);
      });

      it('should work for regular policies', async function () {
        await supertest
          .post(`/api/fleet/package_policies/delete`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [packagePolicy.id] })
          .expect(200);
      });
    });
  });
}
