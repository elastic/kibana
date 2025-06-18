/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN } from '@kbn/cloud-security-posture-common';
import type { CspSetupStatus } from '@kbn/cloud-security-posture-common';
import { LATEST_FINDINGS_INDEX_DEFAULT_NS } from '@kbn/cloud-security-posture-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { EsIndexDataProvider } from '../../../../cloud_security_posture_api/utils';
import { createPackagePolicy } from '../helper';
import { findingsMockData, vulnerabilityMockData } from '../mock_data';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const latestFindingsIndex = new EsIndexDataProvider(es, LATEST_FINDINGS_INDEX_DEFAULT_NS);
  const latestVulnerabilitiesIndex = new EsIndexDataProvider(
    es,
    CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN
  );
  const mock3PIndex = 'security_solution-mock-3p-integration.misconfiguration_latest';
  const _3pIndex = new EsIndexDataProvider(es, mock3PIndex);

  describe('GET /internal/cloud_security_posture/status', () => {
    let agentPolicyId: string;

    describe('STATUS = INDEXED TEST', () => {
      beforeEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');

        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test policy',
            namespace: 'default',
          });

        agentPolicyId = agentPolicyResponse.item.id;

        await latestFindingsIndex.deleteAll();
        await latestVulnerabilitiesIndex.deleteAll();
        await _3pIndex.deleteAll();
      });

      afterEach(async () => {
        await latestFindingsIndex.deleteAll();
        await latestVulnerabilitiesIndex.deleteAll();
        await _3pIndex.destroyIndex();
        await kibanaServer.savedObjects.cleanStandardList();
        await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      });

      it(`Return hasMisconfigurationsFindings true when there are latest findings but no installed integrations`, async () => {
        await latestFindingsIndex.addBulk(findingsMockData);

        const { body: res }: { body: CspSetupStatus } = await supertest
          .get(`/internal/cloud_security_posture/status`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(res.hasMisconfigurationsFindings).to.eql(
          true,
          `expected hasMisconfigurationsFindings to be true but got ${res.hasMisconfigurationsFindings} instead`
        );
      });

      it(`Return hasMisconfigurationsFindings true when there are only findings in third party index`, async () => {
        await _3pIndex.addBulk(findingsMockData);

        const { body: res }: { body: CspSetupStatus } = await supertest
          .get(`/internal/cloud_security_posture/status`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(res.hasMisconfigurationsFindings).to.eql(
          true,
          `expected hasMisconfigurationsFindings to be true but got ${res.hasMisconfigurationsFindings} instead`
        );
      });

      it(`Return hasMisconfigurationsFindings false when there are no findings`, async () => {
        const { body: res }: { body: CspSetupStatus } = await supertest
          .get(`/internal/cloud_security_posture/status`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(res.hasMisconfigurationsFindings).to.eql(
          false,
          `expected hasMisconfigurationsFindings to be false but got ${res.hasMisconfigurationsFindings} instead`
        );
      });

      it(`Return kspm status indexed when logs-cloud_security_posture.findings_latest-default contains new kspm documents`, async () => {
        await createPackagePolicy(
          supertest,
          agentPolicyId,
          'kspm',
          'cloudbeat/cis_k8s',
          'vanilla',
          'kspm'
        );

        await latestFindingsIndex.addBulk(findingsMockData);

        const { body: res }: { body: CspSetupStatus } = await supertest
          .get(`/internal/cloud_security_posture/status`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(res.kspm.status).to.eql(
          'indexed',
          `expected kspm status to be indexed but got ${res.kspm.status} instead`
        );
      });

      it(`Return cspm status indexed when logs-cloud_security_posture.findings_latest-default contains new cspm documents`, async () => {
        await createPackagePolicy(
          supertest,
          agentPolicyId,
          'cspm',
          'cloudbeat/cis_aws',
          'aws',
          'cspm'
        );

        await latestFindingsIndex.addBulk(findingsMockData);

        const { body: res }: { body: CspSetupStatus } = await supertest
          .get(`/internal/cloud_security_posture/status`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(res.cspm.status).to.eql(
          'indexed',
          `expected cspm status to be indexed but got ${res.cspm.status} instead`
        );
      });

      it(`Return vuln status indexed when logs-cloud_security_posture.vulnerabilities_latest-default contains new documents`, async () => {
        await createPackagePolicy(
          supertest,
          agentPolicyId,
          'vuln_mgmt',
          'cloudbeat/vuln_mgmt_aws',
          'aws',
          'vuln_mgmt'
        );

        await latestVulnerabilitiesIndex.addBulk(vulnerabilityMockData);

        const { body: res }: { body: CspSetupStatus } = await supertest
          .get(`/internal/cloud_security_posture/status`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(res.vuln_mgmt.status).to.eql(
          'indexed',
          `expected vuln_mgmt status to be indexed but got ${res.vuln_mgmt.status} instead`
        );
      });
    });
  });
}
