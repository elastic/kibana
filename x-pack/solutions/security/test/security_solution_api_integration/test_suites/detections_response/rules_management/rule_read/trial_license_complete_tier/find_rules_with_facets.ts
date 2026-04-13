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
import { DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS } from '@kbn/security-solution-plugin/common/constants';
import { MAX_FIND_RULES_WITH_FACETS_SEARCH_TERM_LENGTH } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
import { getSimpleRule } from '../../../utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');

  const findRulesWithFacets = (requestBody: Record<string, unknown>) =>
    supertest
      .post(DETECTION_ENGINE_RULES_URL_FIND_WITH_FACETS)
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send(requestBody);

  describe('@ess @serverless @skipInServerlessMKI find_rules_with_facets', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('returns an empty page when no rules exist', async () => {
      const { body } = await findRulesWithFacets({}).expect(200);
      expect(body).to.eql({
        data: [],
        page: 1,
        perPage: 20,
        total: 0,
      });
    });

    it('filters with KQL and intersects legacy search', async () => {
      await createRule(supertest, log, getSimpleRule('facets-kql-search', true));
      const { body } = await findRulesWithFacets({
        filter: 'alert.attributes.enabled: true',
        search: { term: 'Simple', mode: 'legacy' },
      }).expect(200);
      expect(body.total).to.be(1);
    });

    it('returns facet counts when aggregations.counts is set', async () => {
      await createRule(supertest, log, getSimpleRule());
      const { body } = await findRulesWithFacets({
        aggregations: { counts: ['enabled'] },
      }).expect(200);
      expect(body.total).to.be(1);
      expect(body.counts).to.be.an('object');
      expect(body.counts.enabled).to.be.an('object');
      const enabledBuckets = body.counts.enabled as Record<string, number>;
      expect(Object.keys(enabledBuckets).length).to.be.equal(2);
    });

    it('returns 400 for invalid KQL filter', async () => {
      const { body } = await findRulesWithFacets({
        filter: 'alert.attributes.name: (',
      }).expect(400);
      expect(body.status_code).to.be(400);
      expect(body.message).to.be.an('array');
      expect((body.message as string[]).some((m) => m.includes('invalid KQL filter'))).to.be(true);
    });

    it('returns 400 for unsupported sort_field', async () => {
      const { body } = await findRulesWithFacets({
        sort_field: 'not_a_supported_field',
        sort_order: 'asc',
      }).expect(400);
      expect(body.status_code).to.be(400);
    });

    it('returns 400 when search_after is provided without sort_field and sort_order', async () => {
      const { body } = await findRulesWithFacets({
        search_after: ['nonsense-sort-token'],
      }).expect(400);
      expect(body.status_code).to.be(400);
      expect(String(body.message)).to.contain('sort_field and sort_order');
    });

    it('paginates with page under the max result window without response search_after', async () => {
      await createRule(supertest, log, {
        ...getSimpleRule('cursor-rule-a'),
        name: 'Aaa facets cursor rule',
      });
      await createRule(supertest, log, {
        ...getSimpleRule('cursor-rule-b'),
        name: 'Zzz facets cursor rule',
      });

      const first = await findRulesWithFacets({
        per_page: 1,
        page: 1,
        sort_field: 'name',
        sort_order: 'asc',
      }).expect(200);

      expect(first.body.data).to.have.length(1);
      expect(first.body.total).to.be(2);
      expect(first.body.data[0].name).to.be('Aaa facets cursor rule');
      expect(first.body.search_after).to.be(undefined);

      const second = await findRulesWithFacets({
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
      const { body } = await findRulesWithFacets({
        search: { term: 'x'.repeat(MAX_FIND_RULES_WITH_FACETS_SEARCH_TERM_LENGTH + 1) },
      }).expect(400);
      const status = body.status_code ?? body.statusCode;
      expect(status).to.be(400);
      const messageText = Array.isArray(body.message)
        ? body.message.join(' ')
        : String(body.message);
      expect(messageText.toLowerCase()).to.match(/search\.term/);
      expect(messageText.toLowerCase()).to.contain('length');
    });
  });
};
