/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { warnAndSkipTest } from '../../helpers';

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertest');
  const dockerServers = getService('dockerServers');

  const server = dockerServers.get('registry');
  // use function () {} and not () => {} here
  // because `this` has to point to the Mocha context
  // see https://mochajs.org/#arrow-functions

  describe('Package Policy - create', async function () {
    let agentPolicyId: string;
    before(async () => {
      await getService('esArchiver').load('empty_kibana');
      await getService('esArchiver').load('fleet/empty_fleet_server');
    });
    after(async () => {
      await getService('esArchiver').unload('empty_kibana');
      await getService('esArchiver').unload('fleet/empty_fleet_server');
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

    it('should fail for managed agent policies', async function () {
      if (server.enabled) {
        // get a managed policy
        const {
          body: { item: managedPolicy },
        } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Managed policy from ${Date.now()}`,
            namespace: 'default',
            is_managed: true,
          });

        // try to add an integration to the managed policy
        const { body } = await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'filetest-1',
            description: '',
            namespace: 'default',
            policy_id: managedPolicy.id,
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

        expect(body.statusCode).to.be(400);
        expect(body.message).to.contain('Cannot add integrations to managed policy');

        // delete policy we just made
        await supertest.post(`/api/fleet/agent_policies/delete`).set('kbn-xsrf', 'xxxx').send({
          agentPolicyId: managedPolicy.id,
        });
      } else {
        warnAndSkipTest(this, log);
      }
    });

    it('should work with valid values', async function () {
      if (server.enabled) {
        await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'filetest-1',
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
      } else {
        warnAndSkipTest(this, log);
      }
    });

    it('should return a 400 with an empty namespace', async function () {
      if (server.enabled) {
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
      } else {
        warnAndSkipTest(this, log);
      }
    });

    it('should return a 400 with an invalid namespace', async function () {
      if (server.enabled) {
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
      } else {
        warnAndSkipTest(this, log);
      }
    });

    it('should not allow multiple limited packages on the same agent policy', async function () {
      if (server.enabled) {
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
              version: '0.13.0',
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
              version: '0.13.0',
            },
          })
          .expect(500);
      } else {
        warnAndSkipTest(this, log);
      }
    });

    it('should return a 500 if there is another package policy with the same name', async function () {
      if (server.enabled) {
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
          .expect(500);
      } else {
        warnAndSkipTest(this, log);
      }
    });
  });
}
