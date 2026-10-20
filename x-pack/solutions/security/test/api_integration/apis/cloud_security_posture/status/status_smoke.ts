/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import {
  CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS,
  CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
} from '@kbn/cloud-security-posture-common';
import type { CspSetupStatus } from '@kbn/cloud-security-posture-common';
import { createPackagePolicy } from '@kbn/cloud-security-posture-common/test_helper';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { EsIndexDataProvider } from '../../../../cloud_security_posture_api/utils';
import { findingsMockData } from '../mock_data';

/**
 * FTR (L4): one end-to-end smoke for the status route.
 *
 * Sibling coverage:
 * - State machine: server/routes/status/status.test.ts
 * - Orchestration: server/routes/status/status.handler.test.ts
 * - ES privileges: status_unprivileged.ts
 * - Fleet schema: status_contract.ts
 *
 * Rationale: multiple end-to-end smokes for the same feature is an
 * anti-pattern. Keep this file at exactly one `it(...)`.
 */
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const latestFindingsIndex = new EsIndexDataProvider(
    es,
    CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS
  );
  const latestVulnerabilitiesIndex = new EsIndexDataProvider(
    es,
    CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN
  );

  describe('GET /internal/cloud_security_posture/status — happy-path smoke', () => {
    let agentPolicyId: string;

    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    beforeEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();

      await supertest
        .post(`/api/fleet/setup`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .set('kbn-xsrf', 'xxxx')
        .send({ name: 'csp-smoke-policy', namespace: 'default' });

      agentPolicyId = agentPolicyResponse.item.id;

      await latestFindingsIndex.deleteAll();
      await latestVulnerabilitiesIndex.deleteAll();
    });

    afterEach(async () => {
      await latestFindingsIndex.deleteAll();
      await latestVulnerabilitiesIndex.deleteAll();
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    it('returns kspm status indexed end-to-end after package install + findings ingest', async () => {
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
  });
}
