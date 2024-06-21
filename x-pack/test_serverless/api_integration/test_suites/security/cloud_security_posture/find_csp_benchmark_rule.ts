/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type {
  CspBenchmarkRule,
  FindCspBenchmarkRuleResponse,
} from '@kbn/cloud-security-posture-plugin/common/types/latest';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { createPackagePolicy } from '../../../../../test/api_integration/apis/cloud_security_posture/helper'; // eslint-disable-line @kbn/imports/no_boundary_crossing
import { RoleCredentials } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');

  // find csp benchmark rule tests
  describe('GET internal/cloud_security_posture/rules/_find', function () {
    // security_exception: action [indices:admin/create] is unauthorized for user [elastic] with effective roles [superuser] on restricted indices [.fleet-actions-7], this action is granted by the index privileges [create_index,manage,all]
    this.tags(['failsOnMKI']);

    let agentPolicyId: string;
    let roleAuthc: RoleCredentials;
    let internalRequestHeader: { 'x-elastic-internal-origin': string; 'kbn-xsrf': string };

    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      internalRequestHeader = svlCommonApi.getInternalRequestHeader();
    });

    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });

    beforeEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');

      const { body: agentPolicyResponse } = await supertestWithoutAuth
        .post(`/api/fleet/agent_policies`)
        .set(internalRequestHeader)
        .set(roleAuthc.apiKeyHeader)
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

    it(`Should return 500 error code when not provide package policy id or benchmark id`, async () => {
      await createPackagePolicy(
        supertestWithoutAuth,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm',
        'KSPM-1',
        roleAuthc,
        internalRequestHeader
      );

      const { body }: { body: { message: string } } = await supertestWithoutAuth
        .get(`/internal/cloud_security_posture/rules/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(internalRequestHeader)
        .set(roleAuthc.apiKeyHeader)
        .expect(500);

      expect(body.message).to.eql(
        'Please provide either benchmarkId or packagePolicyId, but not both',
        `expected message to be 'Please provide either benchmarkId or packagePolicyId, but not both' but got ${body.message} instead`
      );
    });

    it(`Should return 500 error code when provide both package policy id and benchmark id`, async () => {
      await createPackagePolicy(
        supertestWithoutAuth,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm',
        'KSPM-2',
        roleAuthc,
        internalRequestHeader
      );

      const { body }: { body: { message: string } } = await supertestWithoutAuth
        .get(`/internal/cloud_security_posture/rules/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(internalRequestHeader)
        .set(roleAuthc.apiKeyHeader)
        .query({
          packagePolicyId: 'your-package-policy-id',
          benchmarkId: 'cis_aws',
        })
        .expect(500);

      expect(body.message).to.eql(
        'Please provide either benchmarkId or packagePolicyId, but not both',
        `expected message to be 'Please provide either benchmarkId or packagePolicyId, but not both' but got ${body.message} instead`
      );
    });

    it(`Should return 404 status code when the package policy ID does not exist`, async () => {
      const { body }: { body: { statusCode: number; error: string } } = await supertestWithoutAuth
        .get(`/internal/cloud_security_posture/rules/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(internalRequestHeader)
        .set(roleAuthc.apiKeyHeader)
        .query({
          packagePolicyId: 'non-existing-packagePolicy-id',
        })
        .expect(404);

      expect(body.statusCode).to.eql(
        404,
        `expected status code to be 404 but got ${body.statusCode} instead`
      );
      expect(body.error).to.eql(
        'Not Found',
        `expected error message to be 'Not Found' but got ${body.error} instead`
      );
    });

    it(`Should return 200 status code and filter rules by benchmarkId`, async () => {
      await createPackagePolicy(
        supertestWithoutAuth,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm',
        'KSPM-3',
        roleAuthc,
        internalRequestHeader
      );

      const { body }: { body: FindCspBenchmarkRuleResponse } = await supertestWithoutAuth
        .get(`/internal/cloud_security_posture/rules/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(internalRequestHeader)
        .set(roleAuthc.apiKeyHeader)
        .query({
          benchmarkId: 'cis_k8s',
        })
        .expect(200);

      expect(body.items.length).greaterThan(0);

      const allRulesHaveCorrectBenchmarkId = body.items.every(
        (rule: CspBenchmarkRule) => rule.metadata.benchmark.id === 'cis_k8s'
      );

      expect(allRulesHaveCorrectBenchmarkId).to.eql(
        true,
        `expected true but got ${allRulesHaveCorrectBenchmarkId} instead`
      );
    });

    it(`Should return 200 status code, and only requested fields in the response`, async () => {
      await createPackagePolicy(
        supertestWithoutAuth,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm',
        'KSPM-4',
        roleAuthc,
        internalRequestHeader
      );

      const { body }: { body: FindCspBenchmarkRuleResponse } = await supertestWithoutAuth
        .get(`/internal/cloud_security_posture/rules/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(internalRequestHeader)
        .set(roleAuthc.apiKeyHeader)
        .query({
          benchmarkId: 'cis_k8s',
          fields: ['metadata.name', 'metadata.section', 'metadata.id'],
        })
        .expect(200);

      expect(body.items.length).greaterThan(0);

      const allowedFields = ['name', 'section', 'id'];
      const fieldsMatched = body.items.every((rule: CspBenchmarkRule) => {
        const keys = Object.keys(rule.metadata);
        return (
          keys.length === allowedFields.length && keys.every((key) => allowedFields.includes(key))
        );
      });

      expect(fieldsMatched).to.eql(true, `expected true but got ${fieldsMatched} instead`);
    });

    it(`Should return 200 status code, items sorted by metadata.section field`, async () => {
      await createPackagePolicy(
        supertestWithoutAuth,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm',
        'KSPM-5',
        roleAuthc,
        internalRequestHeader
      );

      const { body }: { body: FindCspBenchmarkRuleResponse } = await supertestWithoutAuth
        .get(`/internal/cloud_security_posture/rules/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(internalRequestHeader)
        .set(roleAuthc.apiKeyHeader)
        .query({
          benchmarkId: 'cis_k8s',
          sortField: 'metadata.section',
          sortOrder: 'asc',
        })
        .expect(200);

      expect(body.items.length).greaterThan(0);

      // check if the items are sorted by metadata.section field
      const sections = body.items.map((rule: CspBenchmarkRule) => rule.metadata.section);
      const isSorted = sections.every(
        (section, index) => index === 0 || section >= sections[index - 1]
      );

      expect(isSorted).to.eql(true, `expected true but got ${isSorted} instead`);
    });

    it(`Should return 200 status code and paginate rules with a limit of PerPage`, async () => {
      const perPage = 10;

      await createPackagePolicy(
        supertestWithoutAuth,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm',
        'KSPM-6',
        roleAuthc,
        internalRequestHeader
      );

      const { body }: { body: FindCspBenchmarkRuleResponse } = await supertestWithoutAuth
        .get(`/internal/cloud_security_posture/rules/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(internalRequestHeader)
        .set(roleAuthc.apiKeyHeader)
        .query({
          benchmarkId: 'cis_k8s',
          perPage,
        })
        .expect(200);

      expect(body.items.length).to.eql(
        perPage,
        `expected length to be ${perPage} but got ${body.items.length} instead`
      );
    });
  });
}
