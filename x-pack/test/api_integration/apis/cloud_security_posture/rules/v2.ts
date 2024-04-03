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
import { createPackagePolicy } from '../helper';

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
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
        });

      agentPolicyId = agentPolicyResponse.item.id;
      await kibanaServer.savedObjects.create({
        id: `TEST-ID-1234567`,
        type: 'csp-rule-template',
        overwrite: true,
        attributes: {
          metadata: {
            audit: "MOCK'",
            benchmark: {
              id: 'cis_k8s',
              name: 'CIS Kubernetes V1.23',
              posture_type: 'kspm',
              rule_number: '2.1.2',
              version: 'v1.9.1',
            },
            default_value: '',
            description: 'MOCK.',
            id: '1d6ff20d-4803-574b-80d2-e47031d9baa2-MOCK',
            impact: '',
            name: 'MOCK',
            profile_applicability: '* Level 2',
            rationale: 'Mock Rationale.',
            references: 'Mock Ref',
            rego_rule_id: 'cis_2_1_2_mock',
            remediation: 'Mock Remediation',
            section: 'Beta',
            tags: ['CIS', 'CIS 2.1.2'],
            version: '1.0',
          },
        },
      });
      await kibanaServer.savedObjects.create({
        id: `TEST-ID-7654321`,
        type: 'csp-rule-template',
        overwrite: true,
        attributes: {
          metadata: {
            audit: "MOCK'",
            benchmark: {
              id: 'cis_k8s',
              name: 'CIS Kubernetes V1.23',
              posture_type: 'kspm',
              rule_number: '2.1.2',
              version: 'v1.9.1',
            },
            default_value: '',
            description: 'MOCK.',
            id: '1d6ff20d-4803-574b-80d2-e47031d9baa2-MOCK',
            impact: '',
            name: 'MOCK',
            profile_applicability: '* Level 2',
            rationale: 'Mock Rationale.',
            references: 'Mock Ref',
            rego_rule_id: 'cis_2_1_2_mock',
            remediation: 'Mock Remediation',
            section: 'Alpha',
            tags: ['CIS', 'CIS 2.1.2'],
            version: '1.0',
          },
        },
      });
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    it(`Should return 500 error code when not provide benchmark id`, async () => {
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
        .set(ELASTIC_HTTP_VERSION_HEADER, '2')
        .set('kbn-xsrf', 'xxxx')
        .expect(500);

      expect(body.message).to.eql(
        'Please provide benchmarkId',
        `expected message to be 'Please provide benchmarkId' but got ${body.message} instead`
      );
    });

    it(`Should return 200 status code and filter rules by benchmarkId and benchmarkVersion`, async () => {
      await createPackagePolicy(
        supertest,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm'
      );

      const { body }: { body: FindCspBenchmarkRuleResponse } = await supertest
        .get(`/internal/cloud_security_posture/rules/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2')
        .set('kbn-xsrf', 'xxxx')
        .query({
          benchmarkId: 'cis_k8s',
          benchmarkVersion: '1.9.1',
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
        supertest,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm'
      );

      const { body }: { body: FindCspBenchmarkRuleResponse } = await supertest
        .get(`/internal/cloud_security_posture/rules/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2')
        .set('kbn-xsrf', 'xxxx')
        .query({
          benchmarkId: 'cis_k8s',
          benchmarkVersion: '1.9.1',
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
        supertest,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm'
      );

      const { body }: { body: FindCspBenchmarkRuleResponse } = await supertest
        .get(`/internal/cloud_security_posture/rules/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2')
        .set('kbn-xsrf', 'xxxx')
        .query({
          benchmarkId: 'cis_k8s',
          benchmarkVersion: '1.9.1',
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
      const perPage = 2;

      await createPackagePolicy(
        supertest,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm'
      );

      const { body }: { body: FindCspBenchmarkRuleResponse } = await supertest
        .get(`/internal/cloud_security_posture/rules/_find`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2')
        .set('kbn-xsrf', 'xxxx')
        .query({
          benchmarkId: 'cis_k8s',
          benchmarkVersion: '1.9.1',
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
