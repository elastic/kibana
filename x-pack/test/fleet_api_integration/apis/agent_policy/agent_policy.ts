/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { FLEET_AGENT_POLICIES_SCHEMA_VERSION } from '@kbn/fleet-plugin/server/constants';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');

  const getPackage = async (pkgName: string) => {
    const getPkgRes = await supertest
      .get(`/api/fleet/epm/packages/${pkgName}`)
      .set('kbn-xsrf', 'xxxx')
      .expect(200);
    return getPkgRes;
  };
  const epmInstall = async (pkgName: string, pkgVersion: string) => {
    const getPkgRes = await supertest
      .post(`/api/fleet/epm/packages/${pkgName}/${pkgVersion}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);
    return getPkgRes;
  };

  describe('fleet_agent_policies', () => {
    skipIfNoDockerRegistry(providerContext);

    describe('GET /api/fleet/agent_policies', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
        await kibanaServer.savedObjects.cleanStandardList();
      });
      setupFleetAndAgents(providerContext);

      it('should get list agent policies', async () => {
        await supertest.get(`/api/fleet/agent_policies`).expect(200);
      });

      it('should get a list of agent policies by kuery', async () => {
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST',
            namespace: 'default',
          })
          .expect(200);
        const { body: responseBody } = await supertest
          .get(`/api/fleet/agent_policies?kuery=ingest-agent-policies.name:TEST`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        expect(responseBody.items.length).to.eql(1);
      });

      it('should return 200 even if the passed kuery does not have prefix ingest-agent-policies', async () => {
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST-1',
            namespace: 'default',
          })
          .expect(200);
        await supertest
          .get(`/api/fleet/agent_policies?kuery=name:TEST-1`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      });

      it('should return 400 if passed kuery is not correct', async () => {
        await supertest
          .get(`/api/fleet/agent_policies?kuery=ingest-agent-policies.non_existent_parameter:test`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);
      });

      it('should return 400 if passed kuery is invalid', async () => {
        await supertest
          .get(`/api/fleet/agent_policies?kuery='test%3A'`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);
      });
    });

    describe('POST /api/fleet/agent_policies', () => {
      let systemPkgVersion: string;
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
        await kibanaServer.savedObjects.cleanStandardList();
      });
      setupFleetAndAgents(providerContext);
      let packagePoliciesToDeleteIds: string[] = [];
      after(async () => {
        if (systemPkgVersion) {
          await supertest.delete(`/api/fleet/epm/packages/system/${systemPkgVersion}`);
        }
        if (packagePoliciesToDeleteIds.length > 0) {
          await kibanaServer.savedObjects.bulkDelete({
            objects: packagePoliciesToDeleteIds.map((id) => ({
              id,
              type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            })),
          });
        }

        await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
        await kibanaServer.savedObjects.cleanStandardList();
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
        expect(body.item.inactivity_timeout).to.equal(1209600);
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

      it('does not allow arbitrary config in agent_features value', async () => {
        await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-agent-features',
            namespace: 'default',
            agent_features: [
              {
                name: 'fqdn',
                enabled: true,
                config: "I'm not allowed yet",
              },
            ],
          })
          .expect(400);
      });

      it('sets given agent_features value', async () => {
        const {
          body: { item: createdPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-agent-features',
            namespace: 'default',
            agent_features: [
              {
                name: 'fqdn',
                enabled: true,
              },
            ],
          })
          .expect(200);

        const { body } = await supertest.get(`/api/fleet/agent_policies/${createdPolicy.id}`);
        expect(body.item.agent_features).to.eql([
          {
            name: 'fqdn',
            enabled: true,
          },
        ]);

        const policyDocRes = await es.search({
          index: '.fleet-policies',
          query: {
            term: {
              policy_id: createdPolicy.id,
            },
          },
        });

        // @ts-expect-error
        expect(policyDocRes?.hits?.hits[0]?._source?.data?.agent?.features).to.eql({
          fqdn: {
            enabled: true,
          },
        });
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

      it('should allow to create policy with the system integration policy and increment correctly the name if package policies are more than 10', async () => {
        // load a bunch of fake system integration policy
        const policyIds = new Array(10).fill(null).map((_, i) => `package-policy-test-${i}`);
        packagePoliciesToDeleteIds = packagePoliciesToDeleteIds.concat(policyIds);
        const getPkRes = await getPackage('system');
        systemPkgVersion = getPkRes.body.item.version;
        // we must first force install the system package to override package verification error on policy create
        const installPromise = await epmInstall('system', `${systemPkgVersion}`);

        await Promise.all([
          installPromise,
          ...policyIds.map((policyId, i) =>
            kibanaServer.savedObjects.create({
              id: policyId,
              type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
              overwrite: true,
              attributes: {
                name: `system-${i + 1}`,
                package: {
                  name: 'system',
                },
              },
            })
          ),
        ]);

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
        await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
        if (systemPkgVersion) {
          await supertest.delete(`/api/fleet/epm/packages/system/${systemPkgVersion}`);
        }
        if (packagePoliciesToDeleteIds.length > 0) {
          await kibanaServer.savedObjects.bulkDelete({
            objects: packagePoliciesToDeleteIds.map((id) => ({
              id,
              type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            })),
          });
        }
      });
      let systemPkgVersion: string;
      const packagePoliciesToDeleteIds: string[] = [];
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
          schema_version: FLEET_AGENT_POLICIES_SCHEMA_VERSION,
          updated_by: 'elastic',
          package_policies: [],
          is_protected: false,
        });
      });

      it('should copy inactivity timeout', async () => {
        const {
          body: { item: policyWithTimeout },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Inactivity test',
            namespace: 'default',
            is_managed: true,
            inactivity_timeout: 123,
          })
          .expect(200);

        const {
          body: { item: newPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies/${policyWithTimeout.id}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Inactivity test copy',
            description: 'Test',
          })
          .expect(200);

        expect(newPolicy.inactivity_timeout).to.eql(123);
      });

      it('should copy tamper protection', async () => {
        const {
          body: { item: originalPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Tamper Protection test',
            description: '',
            namespace: 'default',
          })
          .expect(200);

        await supertest
          .post(`/api/fleet/epm/packages/endpoint/8.10.2`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            force: true,
          })
          .expect(200);

        // add endpoint package policy, which is required for tamper protection
        await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'endpoint-1',
            description: '',
            namespace: 'default',
            policy_id: originalPolicy.id,
            enabled: true,
            inputs: [
              {
                enabled: true,
                streams: [],
                type: 'ENDPOINT_INTEGRATION_CONFIG',
                config: {
                  _config: {
                    value: {
                      type: 'endpoint',
                      endpointConfig: {
                        preset: 'EDRComplete',
                      },
                    },
                  },
                },
              },
            ],
            package: {
              name: 'endpoint',
              title: 'Elastic Endpoint',
              version: '8.10.2',
            },
          })
          .expect(200);

        packagePoliciesToDeleteIds.push('endpoint-1');

        // switch is protected to true
        const {
          body: { item: policyWithTamperProtection },
        } = await supertest
          .put(`/api/fleet/agent_policies/${originalPolicy.id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Tamper Protection test',
            is_managed: false,
            namespace: 'default',
            monitoring_enabled: ['logs', 'metrics'],
            is_protected: true,
          })
          .expect(200);

        createdPolicyIds.push(policyWithTamperProtection.id);

        // test copy
        const {
          body: { item: newPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies/${policyWithTamperProtection.id}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Tamper Protection test copy',
            description: 'Test',
          })
          .expect(200);

        expect(newPolicy.is_protected).to.eql(true);
      });

      it('should increment package policy copy names', async () => {
        async function getSystemPackagePolicyCopyVersion(policyId: string) {
          const {
            body: {
              item: { package_policies: packagePolicies },
            },
          } = await supertest.get(`/api/fleet/agent_policies/${policyId}`).expect(200);

          const matches = packagePolicies[0]?.name.match(/^(.*)\s\(copy\s?([0-9]*)\)$/);

          if (matches) {
            return parseInt(matches[2], 10) || 1;
          }
          return 0;
        }

        const policyId = 'package-policy-test-';
        packagePoliciesToDeleteIds.push(policyId);
        const getPkRes = await getPackage('system');
        systemPkgVersion = getPkRes.body.item.version;
        // we must first force install the system package to override package verification error on policy create
        const installPromise = await epmInstall('system', `${systemPkgVersion}`);

        await Promise.all([
          installPromise,
          kibanaServer.savedObjects.create({
            id: policyId,
            type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            overwrite: true,
            attributes: {
              name: `system-1`,
              package: {
                name: 'system',
              },
            },
          }),
        ]);

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

      it('should work with package policy with space in name', async () => {
        const policyId = 'package-policy-test-1';
        packagePoliciesToDeleteIds.push(policyId);
        const getPkRes = await getPackage('system');
        systemPkgVersion = getPkRes.body.item.version;
        // we must first force install the system package to override package verification error on policy create
        const installPromise = await epmInstall('system', `${systemPkgVersion}`);

        await Promise.all([
          installPromise,
          kibanaServer.savedObjects.create({
            id: policyId,
            type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            overwrite: true,
            attributes: {
              name: `system-1`,
              package: {
                name: 'system',
              },
            },
          }),
        ]);

        const {
          body: {
            item: { id: originalPolicyId },
          },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .query({
            sys_monitoring: false,
          })
          .send({
            name: 'original policy with package policy with space in name',
            namespace: 'default',
          })
          .expect(200);

        await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Filetest with space in name',
            description: '',
            namespace: 'default',
            policy_id: originalPolicyId,
            enabled: true,
            inputs: [],
            package: {
              name: 'filetest',
              title: 'For File Tests',
              version: '0.1.0',
            },
          })
          .expect(200);

        const {
          body: {
            item: { id: copy1Id },
          },
        } = await supertest
          .post(`/api/fleet/agent_policies/${originalPolicyId}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'copy 123',
            description: 'Test',
          })
          .expect(200);

        const {
          body: {
            item: { package_policies: packagePolicies },
          },
        } = await supertest.get(`/api/fleet/agent_policies/${copy1Id}`).expect(200);

        expect(packagePolicies[0].name).to.eql('Filetest with space in name (copy)');
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
            is_protected: false,
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
          schema_version: FLEET_AGENT_POLICIES_SCHEMA_VERSION,
          updated_by: 'elastic',
          inactivity_timeout: 1209600,
          package_policies: [],
          is_protected: false,
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

      // Skipped as cannot force install the system and agent integrations as part of policy creation https://github.com/elastic/kibana/issues/137450
      it.skip('should return a 200 if updating monitoring_enabled on a policy', async () => {
        const fetchPackageList = async () => {
          const response = await supertest
            .get('/api/fleet/epm/packages')
            .set('kbn-xsrf', 'xxx')
            .expect(200);
          return response.body;
        };

        const {
          body: { item: originalPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test_policy',
            description: 'Initial description',
            namespace: 'default',
          })
          .expect(200);

        // uninstall the elastic_agent and verify that is installed after the policy update
        await supertest
          .delete(`/api/fleet/epm/packages/elastic_agent/1.3.3`)
          .set('kbn-xsrf', 'xxxx');

        const listResponse = await fetchPackageList();
        const installedPackages = listResponse.items.filter(
          (item: any) => item.status === 'installed'
        );

        expect(installedPackages.length).to.be(0);

        agentPolicyId = originalPolicy.id;
        const {
          body: { item: updatedPolicy },
        } = await supertest
          .put(`/api/fleet/agent_policies/${agentPolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test_policy_with_monitoring',
            description: 'Updated description',
            namespace: 'default',
            monitoring_enabled: ['logs', 'metrics'],
          })
          .expect(200);
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { id, updated_at, ...newPolicy } = updatedPolicy;
        createdPolicyIds.push(updatedPolicy.id);

        expect(newPolicy).to.eql({
          status: 'active',
          name: 'Test_policy_with_monitoring',
          description: 'Updated description',
          namespace: 'default',
          is_managed: false,
          revision: 2,
          schema_version: FLEET_AGENT_POLICIES_SCHEMA_VERSION,
          updated_by: 'elastic',
          package_policies: [],
          monitoring_enabled: ['logs', 'metrics'],
          inactivity_timeout: 1209600,
        });

        const listResponseAfterUpdate = await fetchPackageList();

        const installedPackagesAfterUpdate = listResponseAfterUpdate.items
          .filter((item: any) => item.status === 'installed')
          .map((item: any) => item.name);
        expect(installedPackagesAfterUpdate).to.contain('elastic_agent');
      });

      it('should allow to set overrides', async () => {
        const {
          body: { item: originalPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Override Test ${Date.now()}`,
            description: 'Initial description',
            namespace: 'default',
          })
          .expect(200);
        agentPolicyId = originalPolicy.id;
        createdPolicyIds.push(agentPolicyId as string);
        const {
          body: { item: updatedPolicy },
        } = await supertest
          .put(`/api/fleet/agent_policies/${agentPolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: originalPolicy.name,
            description: originalPolicy.description,
            namespace: 'default',
            overrides: {
              agent: {
                logging: {
                  level: 'debug',
                },
              },
            },
          })
          .expect(200);

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { id, updated_at, ...newPolicy } = updatedPolicy;

        expect(newPolicy).to.eql({
          status: 'active',
          name: originalPolicy.name,
          description: originalPolicy.description,
          namespace: 'default',
          is_managed: false,
          revision: 2,
          schema_version: FLEET_AGENT_POLICIES_SCHEMA_VERSION,
          updated_by: 'elastic',
          inactivity_timeout: 1209600,
          package_policies: [],
          is_protected: false,
          overrides: {
            agent: {
              logging: {
                level: 'debug',
              },
            },
          },
        });
      });

      it('should not allow to set inputs inside overrides', async () => {
        const {
          body: { item: originalPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Override Test ${Date.now()}`,
            description: 'Initial description',
            namespace: 'default',
          })
          .expect(200);
        agentPolicyId = originalPolicy.id;
        createdPolicyIds.push(agentPolicyId as string);
        await supertest
          .put(`/api/fleet/agent_policies/${agentPolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Override Test ${Date.now()}`,
            description: 'Updated description',
            namespace: 'default',
            overrides: {
              inputs: [],
            },
          })
          .expect(400);
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

    describe('POST /api/fleet/agent_policies/_bulk_get', () => {
      let policyId: string;
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      });
      setupFleetAndAgents(providerContext);
      before(async () => {
        const getPkRes = await getPackage('system');

        // we must first force install the system package to override package verification error on policy create
        await epmInstall('system', `${getPkRes.body.item.version}`);

        const {
          body: { item: createdPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .query({
            sys_monitoring: true,
          })
          .send({
            name: 'Bulk GET test policy',
            namespace: 'default',
          })
          .expect(200);

        policyId = createdPolicy.id;
      });
      after(async () => {
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxx')
          .send({ agentPolicyId: policyId });
        await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      });

      it('should allow to get valid ids', async () => {
        const {
          body: { items },
        } = await supertest
          .post(`/api/fleet/agent_policies/_bulk_get`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            ids: [policyId],
          })
          .expect(200);

        expect(items.length).equal(1);
      });

      it('should populate package_policies if called with ?full=true', async () => {
        const {
          body: { items },
        } = await supertest
          .post(`/api/fleet/agent_policies/_bulk_get`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            ids: [policyId],
            full: true,
          })
          .expect(200);

        expect(items.length).equal(1);
        expect(items[0].package_policies.length).equal(1);
        expect(items[0].package_policies[0]).to.have.property('package');
        expect(items[0].package_policies[0].package.name).equal('system');
      });

      it('should return a 404 with invalid ids', async () => {
        await supertest
          .post(`/api/fleet/agent_policies/_bulk_get`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            ids: [policyId, 'i-am-not-a-valid-policy'],
          })
          .expect(404);
      });

      it('should allow to get valid ids if ids is a mixed of valid and invalid ids and ignoreMissing is provided', async () => {
        const {
          body: { items },
        } = await supertest
          .post(`/api/fleet/agent_policies/_bulk_get`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            ids: [policyId, 'i-am-not-a-valid-policy'],
            ignoreMissing: true,
          })
          .expect(200);

        expect(items.length).equal(1);
      });
    });
  });
}
