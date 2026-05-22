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
import { createRule, deleteAllRules } from '@kbn/detections-response-ftr-services';
import { RULE_MANAGEMENT_RULES_URL_SEARCH } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
import { MAX_SEARCH_RULES_SEARCH_TERM_LENGTH } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_management/api/rules/search_rules/request_schema_validation';
import { getSimpleRule } from '../../../utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');

  const searchRules = (requestBody: Record<string, unknown>) =>
    supertest
      .post(RULE_MANAGEMENT_RULES_URL_SEARCH)
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send(requestBody);

  describe('@ess @serverless @skipInServerlessMKI search_rules', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('returns an empty page when no rules exist', async () => {
      const { body } = await searchRules({}).expect(200);
      expect(body).to.eql({
        data: [],
        page: 1,
        perPage: 20,
        total: 0,
      });
    });

    it('filters with KQL and intersects legacy search', async () => {
      await createRule(supertest, log, {
        ...getSimpleRule('match-rule', true),
        name: 'Simple Rule Match',
        tags: ['match'],
      });
      await createRule(supertest, log, {
        ...getSimpleRule('no-match-tag', true),
        name: 'Simple Rule No Tag',
        tags: ['other'],
      });
      await createRule(supertest, log, {
        ...getSimpleRule('no-match-name', true),
        name: 'Unrelated Detection Rule',
        tags: ['match'],
      });

      const { body } = await searchRules({
        filter: 'alert.attributes.tags: match',
        search: { term: 'Simple', mode: 'legacy' },
      }).expect(200);

      expect(body.total).to.be(1);
      expect(body.data[0].name).to.be('Simple Rule Match');
    });

    it('returns facet counts of filtered rules when aggregations.counts is set', async () => {
      await createRule(supertest, log, { ...getSimpleRule('enabled-rule'), enabled: true });
      await createRule(supertest, log, { ...getSimpleRule('enabled-rule-2'), enabled: true });
      await createRule(supertest, log, { ...getSimpleRule('disabled-rule'), enabled: false });
      const { body } = await searchRules({
        aggregations: { counts: ['enabled'] },
      }).expect(200);
      expect(body.total).to.be(3);
      expect(body.counts).to.be.an('object');
      expect(body.counts.enabled).to.be.an('object');
      const enabledBuckets = body.counts.enabled as Record<string, number>;
      const bucketValues = Object.values(enabledBuckets);
      expect(bucketValues).to.have.length(2);
      expect(bucketValues['0']).to.be(1);
      expect(bucketValues['1']).to.be(2);

      const { body: filteredBody } = await searchRules({
        filter: 'alert.attributes.enabled: true',
        aggregations: { counts: ['enabled'] },
      }).expect(200);
      expect(filteredBody.counts.enabled).to.be.an('object');
      const filteredEnabledBuckets = filteredBody.counts.enabled as Record<string, number>;
      expect(filteredEnabledBuckets['1']).to.be(2);
      expect(filteredEnabledBuckets['0']).to.be(undefined);
    });

    it('returns only requested fields when fields parameter is provided', async () => {
      await createRule(supertest, log, {
        ...getSimpleRule('fields-test', true),
        name: 'Fields Test Rule',
        tags: ['field-test-tag'],
      });

      const { body } = await searchRules({
        fields: ['name', 'tags', 'enabled'],
      }).expect(200);

      expect(body.total).to.be(1);
      const rule = body.data[0] as Record<string, unknown>;

      expect(rule.name).to.be('Fields Test Rule');
      expect(rule.tags).to.eql(['field-test-tag']);
      expect(rule.enabled).to.be(true);

      expect(rule.revision).to.be(undefined);
      expect(rule.execution_summary).to.be(undefined);
    });

    it('returns all fields when fields parameter is omitted', async () => {
      await createRule(supertest, log, getSimpleRule('all-fields-test', true));

      const { body } = await searchRules({}).expect(200);

      expect(body.total).to.be(1);
      const rule = body.data[0] as Record<string, unknown>;

      // Core fields present without a fields filter.
      expect(rule.name).not.to.be(undefined);
      expect(rule.enabled).not.to.be(undefined);
      expect(rule.interval).not.to.be(undefined);
      expect(rule.actions).not.to.be(undefined);
    });

    it('returns 400 for invalid KQL filter', async () => {
      const { body } = await searchRules({
        filter: 'alert.attributes.name: (',
      }).expect(400);
      expect(body.status_code).to.be(400);
      expect(body.message).to.be.an('array');
      expect((body.message as string[]).some((m) => m.includes('invalid KQL filter'))).to.be(true);
    });

    it('returns 400 for unsupported sort_field', async () => {
      await searchRules({
        sort_field: 'not_a_supported_field',
        sort_order: 'asc',
      }).expect(400);
    });

    it('returns 400 when search_after is provided without sort_field and sort_order', async () => {
      const { body } = await searchRules({
        search_after: ['nonsense-sort-token'],
      }).expect(400);
      expect(body.status_code).to.be(400);
      expect(body.message).to.be.an('array');
      expect(
        (body.message as string[]).some((m) =>
          m.includes('when search_after is provided, sort_field and sort_order must be set')
        )
      ).to.be(true);
    });

    it('paginates with page and returns results in sort order without a search_after cursor', async () => {
      await createRule(supertest, log, {
        ...getSimpleRule('cursor-rule-a'),
        name: 'Aaa facets cursor rule',
      });
      await createRule(supertest, log, {
        ...getSimpleRule('cursor-rule-b'),
        name: 'Zzz facets cursor rule',
      });

      const first = await searchRules({
        per_page: 1,
        page: 1,
        sort_field: 'name',
        sort_order: 'asc',
      }).expect(200);

      expect(first.body.data).to.have.length(1);
      expect(first.body.total).to.be(2);
      expect(first.body.data[0].name).to.be('Aaa facets cursor rule');
      expect(first.body.search_after).to.be(undefined);

      const second = await searchRules({
        per_page: 1,
        page: 2,
        sort_field: 'name',
        sort_order: 'asc',
      }).expect(200);

      expect(second.body.data).to.have.length(1);
      expect(second.body.total).to.be(2);
      expect(second.body.data[0].name).to.be('Zzz facets cursor rule');
      expect(second.body.search_after).to.be(undefined);
    });

    it('returns 400 when search.term exceeds max length', async () => {
      const { body } = await searchRules({
        search: { term: 'x'.repeat(MAX_SEARCH_RULES_SEARCH_TERM_LENGTH + 1) },
      }).expect(400);
      expect(body.status_code).to.be(400);
      expect(body.message).to.be.an('array');
      expect(
        (body.message as string[]).some((m) =>
          m.includes(`search.term exceeds maximum length of ${MAX_SEARCH_RULES_SEARCH_TERM_LENGTH}`)
        )
      ).to.be(true);
    });
  });
};
