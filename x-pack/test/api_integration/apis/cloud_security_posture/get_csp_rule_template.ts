/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { GetCspRuleTemplateResponse } from '@kbn/cloud-security-posture-plugin/common/types';
import type { SuperTest, Test } from 'supertest';
import { CspRuleTemplate } from '@kbn/cloud-security-posture-plugin/common/schemas';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('GET internal/cloud_security_posture/rules/_find', () => {
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

    it(`Should return 500 error code when not provide package policy id or benchmark id`, async () => {
      await createPackagePolicy(
        supertest,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm'
      );

      const { body }: { body: { message: string } } = await supertest
        .get(`/internal/cloud_security_posture/rules/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set('kbn-xsrf', 'xxxx')
        .expect(500);

      expect(body.message).to.eql(
        'Please provide either benchmarkId or packagePolicyId, but not both',
        `expected message to be 'Please provide either benchmarkId or packagePolicyId, but not both' but got ${body.message} instead`
      );
    });

    it(`Should return 500 error code when provide both package policy id and benchmark id`, async () => {
      await createPackagePolicy(
        supertest,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm'
      );

      const { body }: { body: { message: string } } = await supertest
        .get(`/internal/cloud_security_posture/rules/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set('kbn-xsrf', 'xxxx')
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
      const { body }: { body: { statusCode: number; error: string } } = await supertest
        .get(`/internal/cloud_security_posture/rules/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set('kbn-xsrf', 'xxxx')
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
        supertest,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm'
      );

      const { body }: { body: GetCspRuleTemplateResponse } = await supertest
        .get(`/internal/cloud_security_posture/rules/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set('kbn-xsrf', 'xxxx')
        .query({
          benchmarkId: 'cis_k8s',
        })
        .expect(200);

      expect(body.items.length).greaterThan(0);

      const allRulesHaveCorrectBenchmarkId = body.items.every(
        (rule: CspRuleTemplate) => rule.metadata.benchmark.id === 'cis_k8s'
      );

      expect(allRulesHaveCorrectBenchmarkId).to.eql(
        true,
        `expected true but got ${allRulesHaveCorrectBenchmarkId} instead`
      );
    });

    it(`Should return 200 status code, and only requested fields in the response`, async () => {
      await createPackagePolicy(
        supertest,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm'
      );

      const { body }: { body: GetCspRuleTemplateResponse } = await supertest
        .get(`/internal/cloud_security_posture/rules/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set('kbn-xsrf', 'xxxx')
        .query({
          benchmarkId: 'cis_k8s',
          fields: ['metadata.name', 'metadata.section', 'metadata.id'],
        })
        .expect(200);

      expect(body.items.length).greaterThan(0);

      const allowedFields = ['name', 'section', 'id'];
      const fieldsMatched = body.items.every((rule: CspRuleTemplate) => {
        const keys = Object.keys(rule.metadata);
        return (
          keys.length === allowedFields.length && keys.every((key) => allowedFields.includes(key))
        );
      });

      expect(fieldsMatched).to.eql(true, `expected true but got ${fieldsMatched} instead`);
    });

    it(`Should return 200 status code, items sorted by metadata.section field`, async () => {
      await createPackagePolicy(
        supertest,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm'
      );

      const { body }: { body: GetCspRuleTemplateResponse } = await supertest
        .get(`/internal/cloud_security_posture/rules/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set('kbn-xsrf', 'xxxx')
        .query({
          benchmarkId: 'cis_k8s',
          sortField: 'metadata.section',
          sortOrder: 'asc',
        })
        .expect(200);

      expect(body.items.length).greaterThan(0);

      // check if the items are sorted by metadata.section field
      const sections = body.items.map((rule: CspRuleTemplate) => rule.metadata.section);
      const isSorted = sections.every(
        (section, index) => index === 0 || section >= sections[index - 1]
      );

      expect(isSorted).to.eql(true, `expected true but got ${isSorted} instead`);
    });

    it(`Should return 200 status code and paginate rules with a limit of PerPage`, async () => {
      const perPage = 10;

      await createPackagePolicy(
        supertest,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm'
      );

      const { body }: { body: GetCspRuleTemplateResponse } = await supertest
        .get(`/internal/cloud_security_posture/rules/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set('kbn-xsrf', 'xxxx')
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

export async function createPackagePolicy(
  supertest: SuperTest<Test>,
  agentPolicyId: string,
  policyTemplate: string,
  input: string,
  deployment: string,
  posture: string
) {
  const version = posture === 'kspm' || posture === 'cspm' ? '1.2.8' : '1.3.0-preview2';
  const title = 'Security Posture Management';
  const streams = [
    {
      enabled: false,
      data_stream: {
        type: 'logs',
        dataset: 'cloud_security_posture.vulnerabilities',
      },
    },
  ];

  const inputTemplate = {
    enabled: true,
    type: input,
    policy_template: policyTemplate,
  };

  const inputs = posture === 'vuln_mgmt' ? { ...inputTemplate, streams } : { ...inputTemplate };

  const { body: postPackageResponse } = await supertest
    .post(`/api/fleet/package_policies`)
    .set('kbn-xsrf', 'xxxx')
    .send({
      force: true,
      name: 'cloud_security_posture-1',
      description: '',
      namespace: 'default',
      policy_id: agentPolicyId,
      enabled: true,
      inputs: [inputs],
      package: {
        name: 'cloud_security_posture',
        title,
        version,
      },
      vars: {
        deployment: {
          value: deployment,
          type: 'text',
        },
        posture: {
          value: posture,
          type: 'text',
        },
      },
    })
    .expect(200);

  return postPackageResponse.item;
}
