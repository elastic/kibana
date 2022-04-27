/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('fleet_agent_policies', () => {
    skipIfNoDockerRegistry(providerContext);
    describe('POST /api/fleet/agent_policies', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
        await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      });
      setupFleetAndAgents(providerContext);
      const packagePoliciesToDeleteIds: string[] = [];
      after(async () => {
        if (packagePoliciesToDeleteIds.length > 0) {
          await kibanaServer.savedObjects.bulkDelete({
            objects: packagePoliciesToDeleteIds.map((id) => ({
              id,
              type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            })),
          });
        }

        await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
        await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
      });
      it('should work with valid minimum required values', async () => {
        const {
          body: { item: createdPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST',
            namespace: 'default',
          })
          .expect(200);

        const { body } = await supertest.get(`/api/fleet/agent_policies/${createdPolicy.id}`);
        expect(body.item.is_managed).to.equal(false);
        expect(body.item.status).to.be('active');
      });

      it('sets given is_managed value', async () => {
        const {
          body: { item: createdPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST2',
            namespace: 'default',
            is_managed: true,
          })
          .expect(200);

        const { body } = await supertest.get(`/api/fleet/agent_policies/${createdPolicy.id}`);
        expect(body.item.is_managed).to.equal(true);

        const {
          body: { item: createdPolicy2 },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST3',
            namespace: 'default',
            is_managed: false,
          })
          .expect(200);

        const {
          body: { item: policy2 },
        } = await supertest.get(`/api/fleet/agent_policies/${createdPolicy2.id}`);
        expect(policy2.is_managed).to.equal(false);
      });

      it('should return a 400 with an empty namespace', async () => {
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST',
            namespace: '',
          })
          .expect(400);
      });

      it('should return a 400 with an empty name', async () => {
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: '  ',
            namespace: 'default',
          })
          .expect(400);
      });

      it('should return a 400 with an invalid namespace', async () => {
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST',
            namespace: 'InvalidNamespace',
          })
          .expect(400);
      });

      it('should return a 409 if policy already exists with name given', async () => {
        const sharedBody = {
          name: 'Name 1',
          namespace: 'default',
        };

        // first one succeeds
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send(sharedBody)
          .expect(200);

        // second one fails because name exists
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send(sharedBody)
          .expect(409);
      });

      it('should create policy with provided id and return 409 the second time', async () => {
        const {
          body: { item: createdPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            id: 'test-id',
            name: 'TEST ID',
            namespace: 'default',
          })
          .expect(200);

        expect(createdPolicy.id).to.equal('test-id');

        // second one fails because id exists
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            id: 'test-id',
            name: 'TEST 2 ID',
            namespace: 'default',
          })
          .expect(409);
      });

      it('should allow to create policy with the system integration policy and increment correctly the name if there is more than 10 package policy', async () => {
        // load a bunch of fake system integration policy
        for (let i = 0; i < 10; i++) {
          await kibanaServer.savedObjects.create({
            id: `package-policy-test-${i}`,
            type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            overwrite: true,
            attributes: {
              name: `system-${i + 1}`,
              package: {
                name: 'system',
              },
            },
          });
          packagePoliciesToDeleteIds.push(`package-policy-test-${i}`);
        }

        // first one succeeds
        const res = await supertest
          .post(`/api/fleet/agent_policies`)
          .query({
            sys_monitoring: true,
          })
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Policy with system monitoring ${Date.now()}`,
            namespace: 'default',
          })
          .expect(200);

        const {
          body: { items: policies },
        } = await supertest.get(`/api/fleet/agent_policies?full=true`).expect(200);

        const policy = policies.find((p: any) => (p.id = res.body.item.id));

        expect(policy.package_policies[0].name).be('system-11');
      });

      it('should allow to create policy with the system integration policy and increment correctly the name', async () => {
        // load a bunch of fake system integration policy
        await kibanaServer.savedObjects.create({
          id: 'package-policy-1',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          overwrite: true,
          attributes: {
            name: 'system-456',
            package: {
              name: 'system',
            },
          },
        });
        packagePoliciesToDeleteIds.push('package-policy-1');
        await kibanaServer.savedObjects.create({
          id: 'package-policy-2',
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          overwrite: true,
          attributes: {
            name: 'system-123',
            package: {
              name: 'system',
            },
          },
        });
        packagePoliciesToDeleteIds.push('package-policy-2');

        // first one succeeds
        const res = await supertest
          .post(`/api/fleet/agent_policies`)
          .query({
            sys_monitoring: true,
          })
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Policy with system monitoring ${Date.now()}`,
            namespace: 'default',
          })
          .expect(200);

        const {
          body: { items: policies },
        } = await supertest.get(`/api/fleet/agent_policies?full=true`).expect(200);

        const policy = policies.find((p: any) => (p.id = res.body.item.id));

        expect(policy.package_policies[0].name).be('system-457');
      });
    });

    describe('POST /api/fleet/agent_policies/{agentPolicyId}/copy', () => {
      before(async () => {
        await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/fleet/agents');
      });
      setupFleetAndAgents(providerContext);
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
      });

      const TEST_POLICY_ID = 'policy1';

      it('should work with valid values', async () => {
        const {
          body: { item },
        } = await supertest
          .post(`/api/fleet/agent_policies/${TEST_POLICY_ID}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Copied policy',
            description: 'Test',
          })
          .expect(200);
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { id, updated_at, ...newPolicy } = item;

        expect(newPolicy).to.eql({
          name: 'Copied policy',
          status: 'active',
          description: 'Test',
          is_managed: false,
          namespace: 'default',
          monitoring_enabled: ['logs', 'metrics'],
          revision: 1,
          updated_by: 'elastic',
          package_policies: [],
        });
      });

      it('should increment package policy copy names', async () => {
        async function getSystemPackagePolicyCopyVersion(policyId: string) {
          const {
            body: {
              item: { package_policies: packagePolicies },
            },
          } = await supertest.get(`/api/fleet/agent_policies/${policyId}`).expect(200);

          const matches = packagePolicies[0].name.match(/^(.*)\s\(copy\s?([0-9]*)\)$/);
          if (matches) {
            return parseInt(matches[2], 10) || 1;
          }

          return 0;
        }
        const {
          body: {
            item: { id: originalPolicyId },
          },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .query({
            sys_monitoring: true,
          })
          .send({
            name: 'original policy',
            namespace: 'default',
          })
          .expect(200);

        expect(await getSystemPackagePolicyCopyVersion(originalPolicyId)).to.be(0);

        const {
          body: {
            item: { id: copy1Id },
          },
        } = await supertest
          .post(`/api/fleet/agent_policies/${originalPolicyId}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'copy 1',
            description: 'Test',
          })
          .expect(200);
        expect(await getSystemPackagePolicyCopyVersion(copy1Id)).to.be(1);

        const {
          body: {
            item: { id: copy2Id },
          },
        } = await supertest
          .post(`/api/fleet/agent_policies/${originalPolicyId}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'copy 2',
            description: 'Test',
          })
          .expect(200);
        expect(await getSystemPackagePolicyCopyVersion(copy2Id)).to.be(2);

        // Copy a copy
        const {
          body: {
            item: { id: copy3Id },
          },
        } = await supertest
          .post(`/api/fleet/agent_policies/${copy2Id}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'copy 3',
            description: 'Test',
          })
          .expect(200);
        expect(await getSystemPackagePolicyCopyVersion(copy3Id)).to.be(3);
      });

      it('should return a 404 with invalid source policy', async () => {
        await supertest
          .post(`/api/fleet/agent_policies/INVALID_POLICY_ID/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Copied policy',
            description: '',
          })
          .expect(404);
      });

      it('should return a 400 with invalid payload', async () => {
        await supertest
          .post(`/api/fleet/agent_policies/${TEST_POLICY_ID}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({})
          .expect(400);
      });

      it('should return a 400 with invalid name', async () => {
        await supertest
          .post(`/api/fleet/agent_policies/${TEST_POLICY_ID}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: '',
          })
          .expect(400);
      });

      it('should return a 409 if policy already exists with name given', async () => {
        const {
          body: { item },
        } = await supertest.get(`/api/fleet/agent_policies/${TEST_POLICY_ID}`).expect(200);

        await supertest
          .post(`/api/fleet/agent_policies/${TEST_POLICY_ID}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: item.name,
          })
          .expect(409);
      });
    });

    describe('PUT /api/fleet/agent_policies/{agentPolicyId}', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      });
      const createdPolicyIds: string[] = [];
      after(async () => {
        const deletedPromises = createdPolicyIds.map((agentPolicyId) =>
          supertest
            .post(`/api/fleet/agent_policies/delete`)
            .set('kbn-xsrf', 'xxxx')
            .send({ agentPolicyId })
            .expect(200)
        );
        await Promise.all(deletedPromises);
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      });
      let agentPolicyId: undefined | string;
      it('should work with valid values', async () => {
        const {
          body: { item: originalPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Initial name',
            description: 'Initial description',
            namespace: 'default',
          })
          .expect(200);
        agentPolicyId = originalPolicy.id;
        const {
          body: { item: updatedPolicy },
        } = await supertest
          .put(`/api/fleet/agent_policies/${agentPolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Updated name',
            description: 'Updated description',
            namespace: 'default',
          })
          .expect(200);
        createdPolicyIds.push(updatedPolicy.id);
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { id, updated_at, ...newPolicy } = updatedPolicy;

        expect(newPolicy).to.eql({
          status: 'active',
          name: 'Updated name',
          description: 'Updated description',
          namespace: 'default',
          is_managed: false,
          revision: 2,
          updated_by: 'elastic',
          package_policies: [],
        });
      });

      it('should return a 409 if policy already exists with name given', async () => {
        const sharedBody = {
          name: 'Initial name',
          description: 'Initial description',
          namespace: 'default',
        };

        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send(sharedBody)
          .expect(200);

        const { body } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send(sharedBody)
          .expect(409);

        expect(body.message).to.match(/already exists?/);

        // same name, different namespace
        sharedBody.namespace = 'different';
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send(sharedBody)
          .expect(409);

        expect(body.message).to.match(/already exists?/);
      });

      it('sets given is_managed value', async () => {
        const {
          body: { item: createdPolicy },
        } = await supertest
          .put(`/api/fleet/agent_policies/${agentPolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST2',
            namespace: 'default',
            is_managed: true,
          })
          .expect(200);

        const getRes = await supertest.get(`/api/fleet/agent_policies/${createdPolicy.id}`);
        const json = getRes.body;
        expect(json.item.is_managed).to.equal(true);

        const {
          body: { item: createdPolicy2 },
        } = await supertest
          .put(`/api/fleet/agent_policies/${agentPolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST2',
            namespace: 'default',
            is_managed: false,
            force: true,
          })
          .expect(200);

        const {
          body: { item: policy2 },
        } = await supertest.get(`/api/fleet/agent_policies/${createdPolicy2.id}`);
        expect(policy2.is_managed).to.equal(false);
      });

      it('should return a 400 if trying to update a managed policy', async () => {
        const {
          body: { item: originalPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Managed policy ${Date.now()}`,
            description: 'Initial description',
            namespace: 'default',
            is_managed: true,
          })
          .expect(200);

        const { body } = await supertest
          .put(`/api/fleet/agent_policies/${originalPolicy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Updated name',
            description: 'Initial description',
            namespace: 'default',
          })
          .expect(400);

        expect(body.message).to.equal(
          'Cannot update name in Fleet because the agent policy is managed by an external orchestration solution, such as Elastic Cloud, Kubernetes, etc. Please make changes using your orchestration solution.'
        );
      });
    });

    describe('POST /api/fleet/agent_policies/delete', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      });
      let hostedPolicy: any | undefined;
      it('should prevent hosted policies being deleted', async () => {
        const {
          body: { item: createdPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Hosted policy',
            namespace: 'default',
            is_managed: true,
          })
          .expect(200);
        hostedPolicy = createdPolicy;
        const { body } = await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxx')
          .send({ agentPolicyId: hostedPolicy.id })
          .expect(400);

        expect(body.message).to.contain('Cannot delete hosted agent policy');
      });

      it('should allow regular policies being deleted', async () => {
        const {
          body: { item: regularPolicy },
        } = await supertest
          .put(`/api/fleet/agent_policies/${hostedPolicy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Regular policy',
            namespace: 'default',
            is_managed: false,
            force: true,
          })
          .expect(200);

        const { body } = await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxx')
          .send({ agentPolicyId: regularPolicy.id });

        expect(body).to.eql({
          id: regularPolicy.id,
          name: 'Regular policy',
        });
      });
    });
  });
}
