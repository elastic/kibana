/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { BenchmarkResponse } from '@kbn/cloud-security-posture-plugin/common/types';
import { FtrProviderContext } from '../../ftr_provider_context';
import { createPackagePolicy } from './status';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('GET /internal/cloud_security_posture/status', () => {
    let agentPolicyId: string;

    beforeEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');

      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
        });

      agentPolicyId = agentPolicyResponse.item.id;
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    it(`Should return non-empty array filled with Rules if user has CSP integrations`, async () => {
      await createPackagePolicy(
        supertest,
        agentPolicyId,
        'cspm',
        'cloudbeat/cis_aws',
        'aws',
        'cspm'
      );

      const { body: res }: { body: BenchmarkResponse } = await supertest
        .get(`/internal/cloud_security_posture/benchmarks`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      expect(res.items.length).greaterThan(0);
    });
  });
}
