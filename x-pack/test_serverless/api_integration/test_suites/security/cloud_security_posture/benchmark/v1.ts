/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { GetBenchmarkResponse } from '@kbn/cloud-security-posture-plugin/common/types/latest';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { createPackagePolicy } from '../../../../../../test/api_integration/apis/cloud_security_posture/helper'; // eslint-disable-line @kbn/imports/no_boundary_crossing

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('GET /internal/cloud_security_posture/benchmark', function () {
    // security_exception: action [indices:admin/create] is unauthorized for user [elastic] with effective roles [superuser] on restricted indices [.fleet-actions-7], this action is granted by the index privileges [create_index,manage,all]
    this.tags(['failsOnMKI']);

    let agentPolicyId: string;
    let agentPolicyId2: string;
    let agentPolicyId3: string;
    let agentPolicyId4: string;

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

      const { body: agentPolicyResponse2 } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy 2',
          namespace: 'default',
        });

      agentPolicyId2 = agentPolicyResponse2.item.id;

      const { body: agentPolicyResponse3 } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy 3',
          namespace: 'default',
        });

      agentPolicyId3 = agentPolicyResponse3.item.id;

      const { body: agentPolicyResponse4 } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy 4',
          namespace: 'default',
        });

      agentPolicyId4 = agentPolicyResponse4.item.id;

      await createPackagePolicy(
        supertest,
        agentPolicyId,
        'cspm',
        'cloudbeat/cis_aws',
        'aws',
        'cspm',
        'CSPM-1'
      );

      await createPackagePolicy(
        supertest,
        agentPolicyId2,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm',
        'KSPM-1'
      );

      await createPackagePolicy(
        supertest,
        agentPolicyId3,
        'vuln_mgmt',
        'cloudbeat/vuln_mgmt_aws',
        'aws',
        'vuln_mgmt',
        'CNVM-1'
      );

      await createPackagePolicy(
        supertest,
        agentPolicyId4,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm',
        'KSPM-2'
      );
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    it(`Should return non-empty array filled with Rules if user has CSP integrations`, async () => {
      const { body: res }: { body: GetBenchmarkResponse } = await supertest
        .get(`/internal/cloud_security_posture/benchmarks`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'xxx')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      expect(res.items.length).equal(3);
    });

    it(`Should return array size 2 when we set per page to be only 2 (total element is still 3)`, async () => {
      const { body: res }: { body: GetBenchmarkResponse } = await supertest
        .get(`/internal/cloud_security_posture/benchmarks?per_page=2`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'xxx')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      expect(res.items.length).equal(2);
    });

    it(`Should return array size 2 when we set per page to be only 2 (total element is still 3)`, async () => {
      const { body: res }: { body: GetBenchmarkResponse } = await supertest
        .get(`/internal/cloud_security_posture/benchmarks?per_page=2&page=2`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'xxx')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      expect(res.items.length).equal(1);
    });

    it(`Should return empty array when we set page to be above the last page number`, async () => {
      const { body: res }: { body: GetBenchmarkResponse } = await supertest
        .get(`/internal/cloud_security_posture/benchmarks?per_page=2&page=3`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'xxx')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      expect(res.items.length).equal(0);
    });
  });
}
