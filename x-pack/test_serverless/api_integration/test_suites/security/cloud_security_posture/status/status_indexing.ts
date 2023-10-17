/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { CspSetupStatus } from '@kbn/cloud-security-posture-plugin/common/types';
import {
  FINDINGS_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
  VULNERABILITIES_INDEX_DEFAULT_NS,
} from '@kbn/cloud-security-posture-plugin/common/constants';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import {
  deleteIndex,
  addIndex,
  createPackagePolicy,
} from '../../../../../../test/api_integration/apis/cloud_security_posture/helper'; // eslint-disable-line @kbn/imports/no_boundary_crossing
import {
  findingsMockData,
  vulnerabilityMockData,
} from '../../../../../../test/api_integration/apis/cloud_security_posture/mock_data'; // eslint-disable-line @kbn/imports/no_boundary_crossing

const INDEX_ARRAY = [
  FINDINGS_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
  VULNERABILITIES_INDEX_DEFAULT_NS,
];

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('GET /internal/cloud_security_posture/status', function () {
    // security_exception: action [indices:admin/create] is unauthorized for user [elastic] with effective roles [superuser] on restricted indices [.fleet-actions-7], this action is granted by the index privileges [create_index,manage,all]
    this.tags(['failsOnMKI']);

    let agentPolicyId: string;

    describe('STATUS = INDEXING TEST', () => {
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
        await deleteIndex(es, INDEX_ARRAY);
        await addIndex(es, findingsMockData, FINDINGS_INDEX_DEFAULT_NS);
        await addIndex(es, vulnerabilityMockData, VULNERABILITIES_INDEX_DEFAULT_NS);
      });

      afterEach(async () => {
        await deleteIndex(es, INDEX_ARRAY);
        await kibanaServer.savedObjects.cleanStandardList();
        await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      });

      it(`Return kspm status indexing when logs-cloud_security_posture.findings_latest-default doesn't contain new kspm documents, but has newly connected agents`, async () => {
        await createPackagePolicy(
          supertest,
          agentPolicyId,
          'kspm',
          'cloudbeat/cis_k8s',
          'vanilla',
          'kspm'
        );

        const { body: res }: { body: CspSetupStatus } = await supertest
          .get(`/internal/cloud_security_posture/status`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'xxx')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(res.kspm.status).to.eql(
          'indexing',
          `expected kspm status to be indexing but got ${res.kspm.status} instead`
        );
      });

      it(`Return cspm status indexing when logs-cloud_security_posture.findings_latest-default doesn't contain new cspm documents, but has newly connected agents  `, async () => {
        await createPackagePolicy(
          supertest,
          agentPolicyId,
          'cspm',
          'cloudbeat/cis_aws',
          'aws',
          'cspm'
        );

        const { body: res }: { body: CspSetupStatus } = await supertest
          .get(`/internal/cloud_security_posture/status`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'xxx')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(res.cspm.status).to.eql(
          'indexing',
          `expected cspm status to be indexing but got ${res.cspm.status} instead`
        );
      });

      it(`Return vuln status indexing when logs-cloud_security_posture.vulnerabilities_latest-default doesn't contain vuln new documents, but has newly connected agents`, async () => {
        await createPackagePolicy(
          supertest,
          agentPolicyId,
          'vuln_mgmt',
          'cloudbeat/vuln_mgmt_aws',
          'aws',
          'vuln_mgmt'
        );

        const { body: res }: { body: CspSetupStatus } = await supertest
          .get(`/internal/cloud_security_posture/status`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'xxx')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(res.vuln_mgmt.status).to.eql(
          'indexing',
          `expected vuln_mgmt status to be indexing but got ${res.vuln_mgmt.status} instead`
        );
      });
    });
  });
}
