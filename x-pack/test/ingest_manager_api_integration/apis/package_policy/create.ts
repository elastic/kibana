/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

    before(async function () {
      const { body: agentPolicyResponse } = await supertest
        .post(`/api/ingest_manager/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
        });
      agentPolicyId = agentPolicyResponse.item.id;
    });

    it('should work with valid values', async function () {
      if (server.enabled) {
        const { body: apiResponse } = await supertest
          .post(`/api/ingest_manager/package_policies`)
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

        expect(apiResponse.success).to.be(true);
      } else {
        warnAndSkipTest(this, log);
      }
    });

    it('should return a 400 with an empty namespace', async function () {
      if (server.enabled) {
        await supertest
          .post(`/api/ingest_manager/package_policies`)
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
          .post(`/api/ingest_manager/package_policies`)
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
      } else {
        warnAndSkipTest(this, log);
      }
    });

    it('should not allow multiple limited packages on the same agent policy', async function () {
      if (server.enabled) {
        await supertest
          .post(`/api/ingest_manager/package_policies`)
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
          .post(`/api/ingest_manager/package_policies`)
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
          .post(`/api/ingest_manager/package_policies`)
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
          .post(`/api/ingest_manager/package_policies`)
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
